import {
  getStoreId,
  setStoreId,
  initStoreInput,
  initNav,
  showToast,
  catalogQuery,
} from "./shared.js";

const storeIdInput = document.getElementById("storeIdInput");
const catalogForm = document.getElementById("catalogForm");
const brandInput = document.getElementById("brandInput");
const flavorInput = document.getElementById("flavorInput");
const skuInput = document.getElementById("skuInput");
const editId = document.getElementById("editId");
const editTier = document.getElementById("editTier");
const saveBtn = document.getElementById("saveBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const catalogList = document.getElementById("catalogList");
const formTitle = document.getElementById("formTitle");
const listHeading = document.getElementById("listHeading");
const tabs = document.querySelectorAll(".tab");

let activeTier = "master";
let catalogData = { master: [], store: [] };

initNav();
initStoreInput(storeIdInput);

storeIdInput.addEventListener("change", () => {
  setStoreId(storeIdInput.value);
  loadCatalog();
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeTier = tab.dataset.tier;
    tabs.forEach((t) => t.classList.toggle("active", t === tab));
    updateFormLabels();
    renderList();
  });
});

cancelEditBtn.addEventListener("click", resetForm);

catalogForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const brand = brandInput.value.trim();
  const flavor = flavorInput.value.trim();
  const sku = skuInput.value.trim() || undefined;
  const id = editId.value;
  const tier = editTier.value || activeTier;

  try {
    if (id) {
      const res = await fetch(`/api/catalog/${tier}/${id}?${catalogQuery()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, flavor, sku, storeId: getStoreId() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("Product updated");
    } else {
      const res = await fetch(`/api/catalog?${catalogQuery()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: activeTier,
          brand,
          flavor,
          sku,
          storeId: getStoreId(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(
        activeTier === "master"
          ? `Added to master catalog: ${brand} ${flavor}`
          : `Added to store catalog: ${brand} ${flavor}`
      );
    }
    resetForm();
    await loadCatalog();
  } catch (err) {
    showToast(err.message || "Save failed", "error");
  }
});

function resetForm() {
  editId.value = "";
  editTier.value = "";
  catalogForm.reset();
  saveBtn.textContent = activeTier === "master" ? "Add to master" : "Add to store";
  cancelEditBtn.classList.add("hidden");
  updateFormLabels();
}

function updateFormLabels() {
  const isMaster = activeTier === "master";
  formTitle.textContent = editId.value
    ? "Edit product"
    : isMaster
      ? "Add to master catalog"
      : "Add to store catalog";
  listHeading.textContent = isMaster ? "Master catalog" : "Store catalog";
  if (!editId.value) {
    saveBtn.textContent = isMaster ? "Add to master" : "Add to store";
  }
}

function startEdit(product, tier) {
  editId.value = product.id;
  editTier.value = tier;
  brandInput.value = product.brand;
  flavorInput.value = product.flavor;
  skuInput.value = product.sku || "";
  saveBtn.textContent = "Save changes";
  cancelEditBtn.classList.remove("hidden");
  formTitle.textContent = "Edit product";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteProduct(id, tier) {
  if (!confirm("Delete this product from the catalog?")) return;
  try {
    const res = await fetch(`/api/catalog/${tier}/${id}?${catalogQuery()}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: getStoreId() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast("Product deleted");
    await loadCatalog();
  } catch (err) {
    showToast(err.message || "Delete failed", "error");
  }
}

function renderList() {
  catalogList.innerHTML = "";
  const products = activeTier === "master" ? catalogData.master : catalogData.store;

  if (!products.length) {
    const empty = document.createElement("li");
    empty.className = "catalog-empty";
    empty.textContent =
      activeTier === "master"
        ? "No products in the master catalog yet. Scans will auto-add new products here."
        : "No store-specific products yet. Add unique items for this shop.";
    catalogList.appendChild(empty);
    return;
  }

  for (const p of products) {
    const li = document.createElement("li");
    li.className = "catalog-item";

    const info = document.createElement("div");
    info.className = "catalog-item-info";

    const name = document.createElement("p");
    name.className = "catalog-item-name";
    name.textContent = `${p.brand} ${p.flavor}`;
    info.appendChild(name);

    const meta = document.createElement("p");
    meta.className = "catalog-item-meta";
    const parts = [p.source === "scan" ? "Auto-learned" : "Manual"];
    if (p.sku) parts.push(`SKU: ${p.sku}`);
    meta.textContent = parts.join(" · ");
    info.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "catalog-item-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn-icon";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => startEdit(p, activeTier));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn-icon btn-icon-danger";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteProduct(p.id, activeTier));

    actions.append(editBtn, delBtn);
    li.append(info, actions);
    catalogList.appendChild(li);
  }
}

async function loadCatalog() {
  try {
    const res = await fetch(`/api/catalog?${catalogQuery()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    catalogData = data;
    renderList();
  } catch (err) {
    showToast(err.message || "Failed to load catalog", "error");
  }
}

updateFormLabels();
loadCatalog();
