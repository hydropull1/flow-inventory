import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const dataDir = join(process.cwd(), "data");
const masterPath = join(dataDir, "master-catalog.json");
const storesDir = join(dataDir, "stores");

function ensureDataDir() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(storesDir)) mkdirSync(storesDir, { recursive: true });
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(path, data) {
  ensureDataDir();
  writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
}

function sanitizeStoreId(storeId) {
  const id = String(storeId || "default")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .slice(0, 64);
  return id || "default";
}

export function catalogKey(brand, flavor, sku) {
  const s = (sku || "").trim().toLowerCase();
  if (s) return `sku:${s}`;
  return `bf:${String(brand || "").trim().toLowerCase()}|${String(flavor || "").trim().toLowerCase()}`;
}

export function parseBrandFlavor(product) {
  const flavor = (product.variant || "").trim();
  let brand = "";
  const name = (product.name || "").trim();
  if (flavor && name.toLowerCase().endsWith(flavor.toLowerCase())) {
    brand = name.slice(0, name.length - flavor.length).trim();
  } else if (flavor && name.includes(flavor)) {
    brand = name.replace(flavor, "").trim();
  } else {
    const parts = name.split(/\s+/);
    brand = parts[0] || name;
  }
  if (!brand) brand = name;
  if (!flavor && name.includes(" ")) {
    const idx = name.indexOf(" ");
    return { brand: name.slice(0, idx).trim(), flavor: name.slice(idx + 1).trim() };
  }
  return { brand, flavor: flavor || name };
}

function normalizeProduct(entry) {
  return {
    id: entry.id,
    brand: String(entry.brand || "").trim(),
    flavor: String(entry.flavor || "").trim(),
    sku: entry.sku ? String(entry.sku).trim() : undefined,
    source: entry.source === "scan" ? "scan" : "manual",
    createdAt: entry.createdAt || new Date().toISOString(),
  };
}

function loadMasterRaw() {
  return readJson(masterPath, { products: [] });
}

function loadStoreRaw(storeId) {
  const id = sanitizeStoreId(storeId);
  return readJson(join(storesDir, `${id}.json`), { storeId: id, products: [] });
}

function saveMaster(data) {
  writeJson(masterPath, data);
}

function saveStore(data) {
  writeJson(join(storesDir, `${data.storeId}.json`), data);
}

export function getCatalogs(storeId) {
  ensureDataDir();
  const master = loadMasterRaw().products.map(normalizeProduct);
  const store = loadStoreRaw(storeId).products.map(normalizeProduct);
  return {
    storeId: sanitizeStoreId(storeId),
    master,
    store,
  };
}

function findInList(products, brand, flavor, sku) {
  const key = catalogKey(brand, flavor, sku);
  return products.find((p) => catalogKey(p.brand, p.flavor, p.sku) === key);
}

export function findCatalogMatch(product, storeId) {
  const { brand, flavor } = parseBrandFlavor(product);
  const sku = product.sku;
  const master = loadMasterRaw().products.map(normalizeProduct);
  const store = loadStoreRaw(storeId).products.map(normalizeProduct);

  const storeMatch = findInList(store, brand, flavor, sku);
  if (storeMatch) return { match: storeMatch, tier: "store", brand, flavor };

  const masterMatch = findInList(master, brand, flavor, sku);
  if (masterMatch) return { match: masterMatch, tier: "master", brand, flavor };

  return { match: null, tier: null, brand, flavor };
}

export function addCatalogProduct(tier, storeId, { brand, flavor, sku, source = "manual" }) {
  const b = String(brand || "").trim();
  const f = String(flavor || "").trim();
  if (!b || !f) throw Object.assign(new Error("Brand and flavor are required"), { status: 400 });

  const entry = normalizeProduct({
    id: randomUUID(),
    brand: b,
    flavor: f,
    sku: sku ? String(sku).trim() : undefined,
    source,
    createdAt: new Date().toISOString(),
  });

  if (tier === "master") {
    const data = loadMasterRaw();
    if (findInList(data.products, b, f, entry.sku)) {
      throw Object.assign(new Error("Product already exists in master catalog"), { status: 409 });
    }
    data.products.push(entry);
    saveMaster(data);
    return { product: entry, tier: "master" };
  }

  if (tier === "store") {
    const id = sanitizeStoreId(storeId);
    const data = loadStoreRaw(id);
    data.storeId = id;
    if (findInList(data.products, b, f, entry.sku)) {
      throw Object.assign(new Error("Product already exists in store catalog"), { status: 409 });
    }
    data.products.push(entry);
    saveStore(data);
    return { product: entry, tier: "store", storeId: id };
  }

  throw Object.assign(new Error("Invalid catalog tier"), { status: 400 });
}

export function updateCatalogProduct(tier, storeId, id, { brand, flavor, sku }) {
  const b = String(brand || "").trim();
  const f = String(flavor || "").trim();
  if (!b || !f) throw Object.assign(new Error("Brand and flavor are required"), { status: 400 });

  if (tier === "master") {
    const data = loadMasterRaw();
    const idx = data.products.findIndex((p) => p.id === id);
    if (idx === -1) throw Object.assign(new Error("Product not found"), { status: 404 });
    const dup = data.products.find(
      (p, i) => i !== idx && catalogKey(p.brand, p.flavor, sku ?? p.sku) === catalogKey(b, f, sku)
    );
    if (dup) throw Object.assign(new Error("Another product with this brand/flavor exists"), { status: 409 });
    data.products[idx] = normalizeProduct({ ...data.products[idx], brand: b, flavor: f, sku });
    saveMaster(data);
    return { product: data.products[idx], tier: "master" };
  }

  if (tier === "store") {
    const sid = sanitizeStoreId(storeId);
    const data = loadStoreRaw(sid);
    const idx = data.products.findIndex((p) => p.id === id);
    if (idx === -1) throw Object.assign(new Error("Product not found"), { status: 404 });
    const dup = data.products.find(
      (p, i) => i !== idx && catalogKey(p.brand, p.flavor, sku ?? p.sku) === catalogKey(b, f, sku)
    );
    if (dup) throw Object.assign(new Error("Another product with this brand/flavor exists"), { status: 409 });
    data.products[idx] = normalizeProduct({ ...data.products[idx], brand: b, flavor: f, sku });
    saveStore(data);
    return { product: data.products[idx], tier: "store", storeId: sid };
  }

  throw Object.assign(new Error("Invalid catalog tier"), { status: 400 });
}

export function deleteCatalogProduct(tier, storeId, id) {
  if (tier === "master") {
    const data = loadMasterRaw();
    const idx = data.products.findIndex((p) => p.id === id);
    if (idx === -1) throw Object.assign(new Error("Product not found"), { status: 404 });
    const removed = data.products.splice(idx, 1)[0];
    saveMaster(data);
    return { product: removed, tier: "master" };
  }

  if (tier === "store") {
    const sid = sanitizeStoreId(storeId);
    const data = loadStoreRaw(sid);
    const idx = data.products.findIndex((p) => p.id === id);
    if (idx === -1) throw Object.assign(new Error("Product not found"), { status: 404 });
    const removed = data.products.splice(idx, 1)[0];
    saveStore(data);
    return { product: removed, tier: "store", storeId: sid };
  }

  throw Object.assign(new Error("Invalid catalog tier"), { status: 400 });
}

export function learnFromScan(products, storeId) {
  const newlyAdded = [];

  for (const product of products) {
    const { match, tier, brand, flavor } = findCatalogMatch(product, storeId);
    if (match) {
      product.catalogMatch = true;
      product.catalogTier = tier;
      product.brand = match.brand;
      product.flavor = match.flavor;
      product.name = `${match.brand} ${match.flavor}`;
      product.variant = match.flavor;
      if (match.sku) product.sku = match.sku;
      continue;
    }

    try {
      const { product: entry } = addCatalogProduct("master", storeId, {
        brand,
        flavor,
        sku: product.sku,
        source: "scan",
      });
      newlyAdded.push(entry);
      product.catalogMatch = true;
      product.catalogTier = "master";
      product.newlyAdded = true;
      product.brand = entry.brand;
      product.flavor = entry.flavor;
      product.name = `${entry.brand} ${entry.flavor}`;
      product.variant = entry.flavor;
    } catch (err) {
      if (err.status === 409) {
        const again = findCatalogMatch(product, storeId);
        if (again.match) {
          product.catalogMatch = true;
          product.catalogTier = again.tier;
          product.brand = again.match.brand;
          product.flavor = again.match.flavor;
          product.name = `${again.match.brand} ${again.match.flavor}`;
          product.variant = again.match.flavor;
        }
      }
    }
  }

  return newlyAdded;
}

export function buildCatalogPrompt(storeId) {
  const { master, store } = getCatalogs(storeId);
  const all = [
    ...master.map((p) => ({ ...p, tier: "master" })),
    ...store.map((p) => ({ ...p, tier: "store" })),
  ];
  if (!all.length) return "";

  const lines = all.slice(0, 150).map((p) => {
    const sku = p.sku ? ` (SKU: ${p.sku})` : "";
    return `- ${p.brand} | ${p.flavor}${sku} [${p.tier}]`;
  });

  return `

KNOWN CATALOG (match these when possible — use exact brand and flavor spelling):
${lines.join("\n")}
When a visible product matches a catalog entry, use that exact brand and flavor in your response.`;
}
