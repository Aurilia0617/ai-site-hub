const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function genId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function nowISO() {
  return new Date().toISOString();
}

function deepClone(v) {
  return JSON.parse(JSON.stringify(v));
}

function defaultRoot() {
  return { version: 1, updated_at: nowISO(), sites: [] };
}

function validateSiteInput(input) {
  if (!input.name || typeof input.name !== "string" || !input.name.trim()) {
    throw Object.assign(new Error("name is required"), { status: 400 });
  }
  if (!input.url || typeof input.url !== "string" || !input.url.trim()) {
    throw Object.assign(new Error("url is required"), { status: 400 });
  }
  try {
    new URL(input.url);
  } catch {
    throw Object.assign(new Error("url must be a valid URL"), { status: 400 });
  }
}

function normalizeMaintainers(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && typeof m.name === "string" && m.name.trim())
    .map((m) => ({
      id: m.id || genId("mnt"),
      name: m.name.trim(),
      contact_url: (m.contact_url || "").trim(),
    }));
}

function createStore(opts) {
  const dataFile = opts.dataFile;
  let data = null;
  let writeChain = Promise.resolve();

  async function writeAtomic() {
    const content = JSON.stringify(data, null, 2);
    const tmp = dataFile + ".tmp";
    const fd = fs.openSync(tmp, "w");
    fs.writeSync(fd, content);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fs.renameSync(tmp, dataFile);
  }

  function enqueueWrite(mutator) {
    writeChain = writeChain.then(async () => {
      const result = mutator(data);
      data.updated_at = nowISO();
      await writeAtomic();
      return result;
    });
    return writeChain;
  }

  return {
    async init() {
      const dir = path.dirname(dataFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(dataFile)) {
        data = defaultRoot();
        await writeAtomic();
      } else {
        const raw = fs.readFileSync(dataFile, "utf-8");
        data = JSON.parse(raw);
        if (!Array.isArray(data.sites)) {
          data.sites = [];
        }
      }
    },

    listSites(filters = {}) {
      let sites = deepClone(data.sites);
      if (filters.q) {
        const q = filters.q.toLowerCase();
        sites = sites.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.url.toLowerCase().includes(q) ||
            s.maintainers.some((m) => m.name.toLowerCase().includes(q))
        );
      }
      if (filters.is_checkin !== undefined) {
        sites = sites.filter((s) => s.is_checkin === filters.is_checkin);
      }
      if (filters.is_benefit !== undefined) {
        sites = sites.filter((s) => s.is_benefit === filters.is_benefit);
      }
      return sites;
    },

    createSite(input) {
      validateSiteInput(input);
      return enqueueWrite((d) => {
        const site = {
          id: genId("site"),
          name: input.name.trim(),
          url: input.url.trim(),
          is_checkin: Boolean(input.is_checkin),
          is_benefit: Boolean(input.is_benefit),
          checkin_url: (input.checkin_url || "").trim(),
          benefit_url: (input.benefit_url || "").trim(),
          maintainers: normalizeMaintainers(input.maintainers),
          created_at: nowISO(),
          updated_at: nowISO(),
        };
        d.sites.push(site);
        return deepClone(site);
      });
    },

    updateSite(id, patch) {
      return enqueueWrite((d) => {
        const idx = d.sites.findIndex((s) => s.id === id);
        if (idx === -1) return null;
        const site = d.sites[idx];
        if (patch.name !== undefined) {
          if (!patch.name || !patch.name.trim()) {
            throw Object.assign(new Error("name cannot be empty"), { status: 400 });
          }
          site.name = patch.name.trim();
        }
        if (patch.url !== undefined) {
          if (!patch.url || !patch.url.trim()) {
            throw Object.assign(new Error("url cannot be empty"), { status: 400 });
          }
          try { new URL(patch.url); } catch {
            throw Object.assign(new Error("url must be a valid URL"), { status: 400 });
          }
          site.url = patch.url.trim();
        }
        if (patch.is_checkin !== undefined) site.is_checkin = Boolean(patch.is_checkin);
        if (patch.is_benefit !== undefined) site.is_benefit = Boolean(patch.is_benefit);
        if (patch.checkin_url !== undefined) site.checkin_url = (patch.checkin_url || "").trim();
        if (patch.benefit_url !== undefined) site.benefit_url = (patch.benefit_url || "").trim();
        if (patch.maintainers !== undefined) {
          site.maintainers = normalizeMaintainers(patch.maintainers);
        }
        site.updated_at = nowISO();
        return deepClone(site);
      });
    },

    deleteSite(id) {
      return enqueueWrite((d) => {
        const idx = d.sites.findIndex((s) => s.id === id);
        if (idx === -1) return false;
        d.sites.splice(idx, 1);
        return true;
      });
    },

    importData(incoming, mode = "upsert") {
      if (!incoming || !Array.isArray(incoming.sites)) {
        throw Object.assign(new Error("Invalid import format: sites array required"), { status: 400 });
      }
      // Pre-validate all sites
      for (const s of incoming.sites) {
        validateSiteInput(s);
      }
      return enqueueWrite((d) => {
        let created = 0;
        let updated = 0;

        if (mode === "replace") {
          const newSites = incoming.sites.map((s) => ({
            id: s.id || genId("site"),
            name: s.name.trim(),
            url: s.url.trim(),
            is_checkin: Boolean(s.is_checkin),
            is_benefit: Boolean(s.is_benefit),
            checkin_url: (s.checkin_url || "").trim(),
            benefit_url: (s.benefit_url || "").trim(),
            maintainers: normalizeMaintainers(s.maintainers),
            created_at: s.created_at || nowISO(),
            updated_at: nowISO(),
          }));
          d.sites = newSites;
          created = newSites.length;
          return { mode, imported_sites: created, created_sites: created, updated_sites: 0, replaced: true };
        }

        // upsert mode
        for (const s of incoming.sites) {
          const existIdx = s.id ? d.sites.findIndex((e) => e.id === s.id) : -1;
          if (existIdx >= 0) {
            const existing = d.sites[existIdx];
            existing.name = s.name.trim();
            existing.url = s.url.trim();
            existing.is_checkin = Boolean(s.is_checkin);
            existing.is_benefit = Boolean(s.is_benefit);
            existing.checkin_url = (s.checkin_url || "").trim();
            existing.benefit_url = (s.benefit_url || "").trim();
            existing.maintainers = normalizeMaintainers(s.maintainers);
            existing.updated_at = nowISO();
            updated++;
          } else {
            d.sites.push({
              id: s.id || genId("site"),
              name: s.name.trim(),
              url: s.url.trim(),
              is_checkin: Boolean(s.is_checkin),
              is_benefit: Boolean(s.is_benefit),
              checkin_url: (s.checkin_url || "").trim(),
              benefit_url: (s.benefit_url || "").trim(),
              maintainers: normalizeMaintainers(s.maintainers),
              created_at: s.created_at || nowISO(),
              updated_at: nowISO(),
            });
            created++;
          }
        }
        return { mode, imported_sites: created + updated, created_sites: created, updated_sites: updated, replaced: false };
      });
    },

    exportData() {
      return deepClone(data);
    },
  };
}

module.exports = { createStore };
