import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  getCatalogs,
  addCatalogProduct,
  updateCatalogProduct,
  deleteCatalogProduct,
  learnFromScan,
  buildCatalogPrompt,
} from "./catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { join, extname } = path;

loadEnv();

function loadEnv() {
  const envPath = join(__dirname, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
  if (process.env.ANTHROPIC_API_KEY) {
    process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY.trim();
  }
}

const ANALYSIS_PROMPT_BASE = `You are analyzing a retail or warehouse photo. Your job is to read the EXACT flavor/variant text printed on EACH individual package or box — not to describe product categories.

MOST IMPORTANT RULE — FLAVOR-FIRST NAMING:
- Look at every single unit in the image. Read the flavor/variant words printed on THAT box, bottle, can, or device.
- The "name" field MUST include the exact flavor/variant text from the label. Brand alone is NEVER enough.
- WRONG: "RAZ Disposable Vape", "Lay's Potato Chips", "Monster Energy"
- RIGHT: "RAZ Blueberry Watermelon", "RAZ Blue Razz Ice", "Lay's Cool Ranch", "Monster Ultra Paradise"
- If you can read any flavor, scent, color, strain, or edition name on the package, you MUST put it in the name. Generic product-type names are forbidden when flavor text is visible.
- Examine each item separately — two boxes side by side may be different flavors. Do not assume they match.

HOW TO READ LABELS:
- Prioritize the largest or most prominent flavor/variant text on the front of each package.
- Include the brand plus the full flavor line exactly as written (e.g. "Blue Razz Ice" not "blue raspberry").
- Include size or nicotine strength in the name only if clearly printed as part of the product name on that unit.
- If flavor text is partially obscured, say what you can read and note uncertainty in "notes" — still do not fall back to a generic name.

LISTING RULES:
- One row per unique SKU (brand + exact flavor/variant + size if it differs).
- Never merge different flavors into one row, even if they are the same brand.
- Same flavor appearing in multiple spots = one row, total count combined.
- Different sizes of the same flavor = separate rows.

For each unique SKU:
- name: "[Brand] [Exact flavor/variant as printed]" — e.g. "RAZ Blueberry Watermelon", "Coca-Cola Cherry Zero"
- variant: Repeat the flavor/variant phrase only (e.g. "Blueberry Watermelon", "Cool Ranch")
- sku: UPC/item code if readable; otherwise null
- count: units of this exact flavor/variant visible
- lowStock: true if this specific flavor's facing looks sparse; otherwise false
- confidence: integer 0–100 — how sure you are that the name, variant, and count are correct for this row. Use 90–100 only when flavor text is clearly readable; 70–89 if somewhat clear; below 70 if guessing, partially obscured, or inferring from packaging color alone
- notes: only if flavor text is unreadable or ambiguous

Respond with ONLY valid JSON, no markdown fences:
{
  "products": [
    { "name": "string", "variant": "string", "sku": "string or null", "count": number, "lowStock": boolean, "confidence": number, "notes": "optional" }
  ],
  "summary": "one sentence overview"
}

If no products are visible, return { "products": [], "summary": "..." }.`;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".ico": "image/x-icon",
};

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function productKey(p) {
  const sku = (p.sku || "").trim().toLowerCase();
  if (sku) return `sku:${sku}`;
  const name = (p.name || "").trim().toLowerCase();
  const variant = (p.variant || "").trim().toLowerCase();
  return `nv:${name}|${variant}`;
}

function mergeProducts(productLists) {
  const merged = new Map();
  for (const products of productLists) {
    for (const p of products) {
      const key = productKey(p);
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, { ...p });
        continue;
      }
      existing.count += p.count;
      existing.lowStock = existing.lowStock || p.lowStock;
      existing.confidence = Math.min(existing.confidence, p.confidence);
      if (p.sku && !existing.sku) existing.sku = p.sku;
      if (p.notes) {
        existing.notes = existing.notes ? `${existing.notes}; ${p.notes}` : p.notes;
      }
    }
  }
  return [...merged.values()];
}

function parseAnalysisJson(text) {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Model did not return JSON");
  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed.products)) throw new Error("Invalid response shape");
  return {
    products: parsed.products.map((p) => ({
      name: String(p.name ?? "Unknown"),
      variant: p.variant ? String(p.variant) : undefined,
      sku: p.sku ? String(p.sku) : undefined,
      count: Number(p.count) || 0,
      lowStock: Boolean(p.lowStock),
      confidence: Math.min(100, Math.max(0, Math.round(Number(p.confidence) || 0))),
      notes: p.notes ? String(p.notes) : undefined,
    })),
    summary: parsed.summary ? String(parsed.summary) : undefined,
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function analyzeImage(base64, mediaType, storeId) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw Object.assign(
      new Error("ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key."),
      { status: 500 }
    );
  }

  const prompt = ANALYSIS_PROMPT_BASE + buildCatalogPrompt(storeId);
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw Object.assign(new Error(`Anthropic API error (${res.status})`), { status: res.status });
  }
  if (!res.ok) {
    const msg = data.error?.message || `Anthropic API error (${res.status})`;
    const status =
      res.status === 401 ? 401 : res.status >= 400 && res.status < 500 ? res.status : 502;
    throw Object.assign(new Error(msg), { status });
  }

  const textBlock = data.content?.find((b) => b.type === "text");
  if (!textBlock?.text) throw new Error("Empty response from Claude");
  return parseAnalysisJson(textBlock.text);
}

function serveStatic(filePath, res) {
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = extname(filePath);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  res.end(readFileSync(filePath));
}

function getStoreId(url, body) {
  return body?.storeId || url.searchParams.get("storeId") || process.env.DEFAULT_STORE_ID || "default";
}

const publicDir = join(__dirname, "public");

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/health") {
    json(res, 200, { ok: true, hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY) });
    return;
  }

  if (url.pathname.startsWith("/api/catalog")) {
    try {
      const storeId = getStoreId(url, null);

      if (req.method === "GET" && url.pathname === "/api/catalog") {
        json(res, 200, getCatalogs(storeId));
        return;
      }

      const raw = req.method !== "GET" ? await readBody(req) : null;
      const body = raw ? JSON.parse(raw.toString("utf8")) : {};

      if (req.method === "POST" && url.pathname === "/api/catalog") {
        const tier = body.tier;
        const sid = getStoreId(url, body);
        const result = addCatalogProduct(tier, sid, body);
        json(res, 201, result);
        return;
      }

      const parts = url.pathname.split("/");
      const tier = parts[3];
      const id = parts[4];

      if (req.method === "PUT" && tier && id) {
        const sid = getStoreId(url, body);
        const result = updateCatalogProduct(tier, sid, id, body);
        json(res, 200, result);
        return;
      }

      if (req.method === "DELETE" && tier && id) {
        const sid = getStoreId(url, body);
        const result = deleteCatalogProduct(tier, sid, id);
        json(res, 200, result);
        return;
      }

      json(res, 404, { error: "Not found" });
    } catch (err) {
      json(res, err.status || 500, { error: err.message || "Catalog error" });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/analyze") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw.toString("utf8"));
      const storeId = getStoreId(url, body);

      let images = body.images;
      if (!images?.length && body.image && body.mediaType) {
        images = [{ image: body.image, mediaType: body.mediaType }];
      }

      if (!images?.length) {
        json(res, 400, { error: "Missing images" });
        return;
      }

      if (images.length > 20) {
        json(res, 400, { error: "Maximum 20 photos per upload" });
        return;
      }

      for (const img of images) {
        if (!img.image || !img.mediaType) {
          json(res, 400, { error: "Each image needs image and mediaType" });
          return;
        }
        if (Buffer.from(img.image, "base64").length > 10 * 1024 * 1024) {
          json(res, 400, { error: "Each image must be under 10 MB" });
          return;
        }
      }

      const perPhoto = [];
      for (const img of images) {
        perPhoto.push((await analyzeImage(img.image, img.mediaType, storeId)).products);
      }

      const products = mergeProducts(perPhoto);
      const newlyAdded = learnFromScan(products, storeId);
      const photoCount = images.length;

      json(res, 200, {
        products,
        photoCount,
        storeId,
        newlyAdded,
        summary:
          photoCount === 1
            ? `Inventory from 1 shelf photo — ${products.length} unique SKU(s), ${products.reduce((s, p) => s + p.count, 0)} unit(s).${newlyAdded.length ? ` ${newlyAdded.length} new product(s) added to master catalog.` : ""}`
            : `Master inventory from ${photoCount} shelf photos — ${products.length} unique SKU(s), ${products.reduce((s, p) => s + p.count, 0)} unit(s) combined.${newlyAdded.length ? ` ${newlyAdded.length} new product(s) added to master catalog.` : ""}`,
      });
    } catch (err) {
      json(res, err.status || 500, { error: err.message || "Analysis failed" });
    }
    return;
  }

  let filePath = join(publicDir, url.pathname === "/" ? "index.html" : url.pathname);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  serveStatic(filePath, res);
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`Product Scanner running at http://localhost:${port}`);
});
