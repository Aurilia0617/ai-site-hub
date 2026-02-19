const express = require("express");
const cors = require("cors");
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
  res.status(401).json({ error: { code: "UNAUTHORIZED", message: "需要认证" } });
});

function parseBool(v) {
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

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
  const filename = `site-hub-export-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "application/json");
  res.json(data);
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
