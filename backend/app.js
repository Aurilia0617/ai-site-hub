const express = require("express");
const cors = require("cors");
const path = require("path");
const { createStore } = require("./store");

const PORT = process.env.PORT || 8080;
const DATA_FILE = process.env.DATA_FILE || "./data/sites.json";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const ACCESS_PASSWORD = (process.env.ACCESS_PASSWORD || "").trim();

const app = express();
const store = createStore({ dataFile: DATA_FILE });

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "2mb" }));

// Auth check - is password required?
app.get("/api/v1/auth/check", (req, res) => {
  res.json({ required: !!ACCESS_PASSWORD });
});

// Auth verify - validate password
app.post("/api/v1/auth/verify", (req, res) => {
  if (!ACCESS_PASSWORD) {
    return res.json({ ok: true });
  }
  const { password } = req.body || {};
  if (password === ACCESS_PASSWORD) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "密码错误" } });
  }
});

// Auth middleware - protect all other /api routes
app.use("/api", (req, res, next) => {
  if (!ACCESS_PASSWORD) return next();
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token === ACCESS_PASSWORD) return next();
  console.log(`[auth] 401 denied: ${req.method} ${req.path}`);
  res.status(401).json({ error: { code: "UNAUTHORIZED", message: "需要认证" } });
});

function parseBool(v) {
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

// GET /api/v1/tags
app.get("/api/v1/tags", (req, res) => {
  const tags = store.listTags();
  res.json({ tags });
});

// GET /api/v1/sites
app.get("/api/v1/sites", (req, res) => {
  const filters = {
    q: req.query.q || undefined,
    is_checkin: parseBool(req.query.is_checkin),
    is_benefit: parseBool(req.query.is_benefit),
  };
  const items = store.listSites(filters);
  res.json({ items, total: items.length });
});

// POST /api/v1/sites
app.post("/api/v1/sites", async (req, res, next) => {
  try {
    const site = await store.createSite(req.body);
    res.status(201).json({ site });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/sites/:id
app.patch("/api/v1/sites/:id", async (req, res, next) => {
  try {
    const site = await store.updateSite(req.params.id, req.body);
    if (!site) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Site not found" } });
    }
    res.json({ site });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/sites/:id/balance - proxy wallet balance query for new-api sites
app.get("/api/v1/sites/:id/balance", async (req, res, next) => {
  try {
    const site = store.getSiteRaw(req.params.id);
    if (!site) {
      console.log(`[balance] site not found: ${req.params.id}`);
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Site not found" } });
    }
    if (site.site_type !== "new-api" || !site.api_key || !site.api_user_id) {
      console.log(`[balance] site ${site.name} (${site.id}): site_type=${site.site_type}, api_key=${site.api_key ? "set" : "empty"}, api_user_id=${site.api_user_id || "empty"}`);
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "该站点未配置系统访问令牌或用户 ID" } });
    }
    const baseUrl = site.url.replace(/\/$/, "");
    const authHeaders = {
      Authorization: `Bearer ${site.api_key}`,
      "New-Api-User": site.api_user_id,
    };
    const fetchOpts = { headers: authHeaders, redirect: "follow", signal: AbortSignal.timeout(10000) };
    console.log(`[balance] querying wallet+checkin for ${site.name}`);
    const [walletResp, checkinResp] = await Promise.all([
      fetch(`${baseUrl}/api/user/self`, fetchOpts),
      fetch(`${baseUrl}/api/user/checkin`, fetchOpts).catch((err) => {
        console.log(`[balance] checkin fetch failed for ${site.name}: ${err.message}`);
        return null;
      }),
    ]);
    if (!walletResp.ok) {
      const errText = await walletResp.text().catch(() => "");
      console.log(`[balance] upstream error for ${site.name}: ${walletResp.status} ${errText.slice(0, 200)}`);
      return res.status(502).json({ error: { code: "UPSTREAM_ERROR", message: `上游返回 ${walletResp.status}` } });
    }
    const walletBody = await walletResp.json();
    const quota = walletBody?.data?.quota ?? 0;
    let checkin = null;
    if (checkinResp && checkinResp.ok) {
      try {
        const checkinBody = await checkinResp.json();
        const stats = checkinBody?.data?.stats;
        if (stats) {
          checkin = {
            count: stats.total_checkins || 0,
            total_quota: stats.total_quota || 0,
            checked_in_today: !!stats.checked_in_today,
          };
        }
      } catch (parseErr) {
        console.log(`[balance] checkin parse error for ${site.name}: ${parseErr.message}`);
      }
    }
    console.log(`[balance] ${site.name}: quota=${quota}, checkin=${JSON.stringify(checkin)}`);
    res.json({ success: true, data: { quota, checkin } });
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      console.log(`[balance] timeout for site ${req.params.id}`);
      return res.status(504).json({ error: { code: "TIMEOUT", message: "查询上游超时" } });
    }
    console.error(`[balance] error for site ${req.params.id}:`, err.message);
    next(err);
  }
});

// POST /api/v1/sites/:id/checkin - proxy checkin for new-api sites
app.post("/api/v1/sites/:id/checkin", async (req, res, next) => {
  try {
    const site = store.getSiteRaw(req.params.id);
    if (!site) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Site not found" } });
    }
    if (site.site_type !== "new-api" || !site.api_key || !site.api_user_id) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "该站点未配置系统访问令牌或用户 ID" } });
    }
    const baseUrl = site.url.replace(/\/$/, "");
    console.log(`[checkin] signing in for ${site.name}`);
    const resp = await fetch(`${baseUrl}/api/user/checkin`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${site.api_key}`,
        "New-Api-User": site.api_user_id,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.log(`[checkin] upstream error for ${site.name}: ${resp.status} ${errText.slice(0, 200)}`);
      return res.status(502).json({ error: { code: "UPSTREAM_ERROR", message: `上游返回 ${resp.status}` } });
    }
    const body = await resp.json().catch(() => ({ success: false, message: "响应解析失败" }));
    console.log(`[checkin] ${site.name}: success=${body.success}, message=${body.message}`);
    res.json(body);
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return res.status(504).json({ error: { code: "TIMEOUT", message: "签到超时" } });
    }
    next(err);
  }
});

// DELETE /api/v1/sites/:id
app.delete("/api/v1/sites/:id", async (req, res, next) => {
  try {
    const deleted = await store.deleteSite(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Site not found" } });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/import
app.post("/api/v1/import", async (req, res, next) => {
  try {
    const mode = req.query.mode === "replace" ? "replace" : "upsert";
    const result = await store.importData(req.body, mode);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/export
app.get("/api/v1/export", (req, res) => {
  const data = store.exportData();
  // Strip sensitive fields from exported sites
  if (Array.isArray(data.sites)) {
    for (const s of data.sites) {
      delete s.api_key;
      delete s.api_user_id;
    }
  }
  const filename = `site-hub-export-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "application/json");
  res.json(data);
});

// Serve frontend static files
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// SPA fallback - serve index.html for non-API routes
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(publicDir, "index.html"));
});

// Error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: { code: status === 500 ? "INTERNAL_ERROR" : "VALIDATION_ERROR", message: err.message },
  });
});

store
  .init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`site-hub backend listening on :${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize store:", err);
    process.exit(1);
  });
