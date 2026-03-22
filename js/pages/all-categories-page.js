import { getAllCategories } from "../services/categories-service.js";

const $ = (id) => document.getElementById(id);

const els = {
  search: $("allCategoriesSearch"),
  list: $("allCategoriesList"),
  loading: $("allCategoriesLoading"),
  empty: $("allCategoriesEmpty"),
  error: $("allCategoriesError"),
};

let categoryCache = [];

function esc(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setLoading(v) {
  if (els.loading) els.loading.style.display = v ? "block" : "none";
}

function setError(msg = "") {
  if (!els.error) return;
  els.error.textContent = msg;
  els.error.style.display = msg ? "block" : "none";
}

function renderCategories(rows) {
  if (!els.list) return;

  if (!rows.length) {
    if (els.empty) els.empty.style.display = "block";
    els.list.innerHTML = "";
    return;
  }

  if (els.empty) els.empty.style.display = "none";

  els.list.innerHTML = rows
    .map(
      (row) => `
      <button class="category-item" data-category="${esc(row.name)}">
        <span class="name">${esc(row.name)}</span>
        <span class="count">${row.count ?? 0}</span>
      </button>
    `
    )
    .join("");
}

function applySearch() {
  const q = (els.search?.value || "").trim().toLowerCase();
  if (!q) return renderCategories(categoryCache);

  const filtered = categoryCache.filter((x) => x.name.toLowerCase().includes(q));
  renderCategories(filtered);
}

async function init() {
  setError("");
  setLoading(true);

  try {
    categoryCache = await getAllCategories({ includeCounts: true });
    renderCategories(categoryCache);
  } catch (e) {
    setError(e?.message || "Failed to load categories.");
  } finally {
    setLoading(false);
  }

  if (els.search) {
    els.search.addEventListener("input", applySearch);
  }

  if (els.list) {
    els.list.addEventListener("click", (e) => {
      const btn = e.target.closest(".category-item");
      if (!btn) return;

      const category = btn.dataset.category;
      const targetPage = els.list.dataset.categoryPage || "./woodworkers.html";
      window.location.href = `${targetPage}?name=${encodeURIComponent(category)}`;
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
