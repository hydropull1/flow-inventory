import {
  getStoreId,
  initStoreInput,
  initNav,
  showNewProductToasts,
} from "./shared.js";

const fileInput = document.getElementById("fileInput");
const uploadZone = document.getElementById("uploadZone");
const previewGrid = document.getElementById("previewGrid");
const uploadActions = document.getElementById("uploadActions");
const clearBtn = document.getElementById("clearBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const productListEl = document.getElementById("productList");
const storeIdInput = document.getElementById("storeIdInput");

const selectedFiles = [];
const CONFIDENCE_THRESHOLD = 80;
const MAX_FILES = 20;

initNav();
initStoreInput(storeIdInput);

function show(el) {
  el.classList.remove("hidden");
}

function hide(el) {
  el.classList.add("hidden");
}

function setStatus(message, type = "loading") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  show(statusEl);
}

function clearStatus() {
  hide(statusEl);
  statusEl.textContent = "";
}

function fileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function addFiles(fileList) {
  const incoming = [...fileList].filter((f) => f.type.startsWith("image/"));
  if (!incoming.length) return;

  for (const file of incoming) {
    if (selectedFiles.some((f) => fileKey(f) === fileKey(file))) continue;
    if (selectedFiles.length >= MAX_FILES) break;
    selectedFiles.push(file);
  }

  renderPreviews();
  hide(resultsEl);
  clearStatus();
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderPreviews();
}

function clearAllFiles() {
  selectedFiles.length = 0;
  fileInput.value = "";
  previewGrid.innerHTML = "";
  hide(previewGrid);
  hide(uploadActions);
  hide(resultsEl);
  clearStatus();
}

function renderPreviews() {
  previewGrid.innerHTML = "";

  if (!selectedFiles.length) {
    hide(previewGrid);
    hide(uploadActions);
    return;
  }

  selectedFiles.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "preview-item";

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.alt = file.name;

    const label = document.createElement("span");
    label.className = "preview-label";
    label.textContent = file.name;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "preview-remove";
    remove.setAttribute("aria-label", `Remove ${file.name}`);
    remove.textContent = "×";
    remove.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      removeFile(index);
    });

    item.append(img, label, remove);
    previewGrid.appendChild(item);
  });

  show(previewGrid);
  show(uploadActions);
  analyzeBtn.textContent =
    selectedFiles.length === 1
      ? "Analyze 1 shelf"
      : `Analyze ${selectedFiles.length} shelves`;
}

fileInput.addEventListener("change", () => {
  if (fileInput.files?.length) addFiles(fileInput.files);
  fileInput.value = "";
});

uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("dragover");
});

uploadZone.addEventListener("dragleave", () => {
  uploadZone.classList.remove("dragover");
});

uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("dragover");
  if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
});

clearBtn.addEventListener("click", clearAllFiles);

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function renderResults(data) {
  productListEl.innerHTML = "";

  if (data.summary) {
    summaryEl.textContent = data.summary;
    show(summaryEl);
  } else {
    hide(summaryEl);
  }

  if (!data.products?.length) {
    const empty = document.createElement("li");
    empty.className = "product-item";
    empty.textContent = "No products detected in these photos.";
    productListEl.appendChild(empty);
    show(resultsEl);
    return;
  }

  const sorted = [...data.products].sort((a, b) => {
    const aLowConf = a.confidence < CONFIDENCE_THRESHOLD;
    const bLowConf = b.confidence < CONFIDENCE_THRESHOLD;
    if (aLowConf !== bLowConf) return aLowConf ? -1 : 1;
    if (a.lowStock !== b.lowStock) return a.lowStock ? -1 : 1;
    const nameA = (a.name + (a.variant || "")).toLowerCase();
    const nameB = (b.name + (b.variant || "")).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const totalSkus = sorted.length;
  const totalUnits = sorted.reduce((sum, p) => sum + p.count, 0);
  const stats = document.createElement("p");
  stats.className = "results-stats";
  const photoLabel = data.photoCount
    ? `${data.photoCount} photo${data.photoCount === 1 ? "" : "s"} · `
    : "";
  stats.textContent = `${photoLabel}${totalSkus} unique SKU${totalSkus === 1 ? "" : "s"} · ${totalUnits} unit${totalUnits === 1 ? "" : "s"} total`;
  productListEl.appendChild(stats);

  for (const product of sorted) {
    const lowConfidence = product.confidence < CONFIDENCE_THRESHOLD;
    const li = document.createElement("li");
    li.className = `product-item${product.lowStock ? " low-stock" : ""}${lowConfidence ? " low-confidence" : ""}${product.newlyAdded ? " newly-added" : ""}`;

    const info = document.createElement("div");
    info.className = "product-info";

    const nameRow = document.createElement("div");
    nameRow.className = "product-name-row";

    const name = document.createElement("p");
    name.className = "product-name";
    name.textContent = product.name;
    nameRow.appendChild(name);

    if (product.catalogMatch && product.catalogTier) {
      const catBadge = document.createElement("span");
      catBadge.className = `catalog-badge catalog-${product.catalogTier}`;
      catBadge.textContent =
        product.catalogTier === "master" ? "Master catalog" : "Store catalog";
      nameRow.appendChild(catBadge);
    }

    if (product.newlyAdded) {
      const newBadge = document.createElement("span");
      newBadge.className = "catalog-badge catalog-new";
      newBadge.textContent = "New";
      nameRow.appendChild(newBadge);
    }

    info.appendChild(nameRow);

    if (product.variant) {
      const variant = document.createElement("p");
      variant.className = "product-variant";
      variant.textContent = product.variant;
      info.appendChild(variant);
    }

    if (product.sku) {
      const sku = document.createElement("p");
      sku.className = "product-sku";
      sku.textContent = `SKU: ${product.sku}`;
      info.appendChild(sku);
    }

    if (product.notes) {
      const notes = document.createElement("p");
      notes.className = "product-notes";
      notes.textContent = product.notes;
      info.appendChild(notes);
    }

    const meta = document.createElement("div");
    meta.className = "product-meta";

    const confidence = document.createElement("span");
    confidence.className = `confidence-badge ${lowConfidence ? "low" : "ok"}`;
    confidence.textContent = `${product.confidence}%`;
    confidence.title = lowConfidence
      ? "Low confidence — verify this identification manually"
      : "AI confidence in this identification";
    meta.appendChild(confidence);

    const count = document.createElement("span");
    count.className = "count-badge";
    count.textContent = product.count === 1 ? "×1" : `×${product.count}`;
    meta.appendChild(count);

    const badge = document.createElement("span");
    badge.className = `stock-badge ${product.lowStock ? "low" : "ok"}`;
    badge.textContent = product.lowStock ? "Low stock" : "OK";
    meta.appendChild(badge);

    li.append(info, meta);
    productListEl.appendChild(li);
  }

  show(resultsEl);
}

analyzeBtn.addEventListener("click", async () => {
  if (!selectedFiles.length) return;

  analyzeBtn.disabled = true;
  clearBtn.disabled = true;
  hide(resultsEl);

  const count = selectedFiles.length;
  setStatus(
    count === 1
      ? "Analyzing shelf with Claude…"
      : `Analyzing ${count} shelves and building master inventory…`,
    "loading"
  );

  try {
    const images = await Promise.all(
      selectedFiles.map(async (file) => ({
        image: await readFileAsBase64(file),
        mediaType: file.type,
      }))
    );

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images, storeId: getStoreId() }),
    });

    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(
        "Server returned an invalid response. Open the app at http://localhost:3000 (not a file preview or other port), then try again."
      );
    }

    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }

    clearStatus();
    renderResults(data);
    showNewProductToasts(data.newlyAdded);
  } catch (err) {
    setStatus(err.message || "Something went wrong", "error");
  } finally {
    analyzeBtn.disabled = false;
    clearBtn.disabled = false;
  }
});
