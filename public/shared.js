const STORE_KEY = "product-scanner-store-id";

export function getStoreId() {
  return localStorage.getItem(STORE_KEY) || "default";
}

export function setStoreId(id) {
  const val = String(id || "default").trim() || "default";
  localStorage.setItem(STORE_KEY, val);
  return val;
}

export function catalogQuery() {
  return `storeId=${encodeURIComponent(getStoreId())}`;
}

export function showToast(message, type = "success") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

export function showNewProductToasts(newlyAdded) {
  if (!newlyAdded?.length) return;
  for (const p of newlyAdded) {
    showToast(`New Product Added: ${p.brand} ${p.flavor}`, "new");
  }
}

export function initStoreInput(inputEl) {
  if (!inputEl) return;
  inputEl.value = getStoreId();
  inputEl.addEventListener("change", () => setStoreId(inputEl.value));
  inputEl.addEventListener("blur", () => setStoreId(inputEl.value));
}

export function initNav() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  document.querySelectorAll(".nav-link").forEach((link) => {
    const href = link.getAttribute("href")?.replace(/\/$/, "") || "/";
    link.classList.toggle("active", href === path);
  });
}
