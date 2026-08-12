/* ============================================================
   Honeystreet — Shop Page Script
   Product grid, filtering (category/brand/size/color/price/rating),
   sorting, pagination.
   ============================================================ */

import { api, formatPrice } from "./api.js";
import { renderProductGrid, skeletonGrid, initProductActions, initQuickView } from "./products.js";

const state = {
  page: 1,
  limit: 9,
  category: "",
  brands: [],
  sizes: [],
  colors: [],
  min_price: 0,
  max_price: 6000,
  rating: 0,
  sort: "newest",
  q: "",
  total: 0,
  pages: 0,
};

// Parse URL query params
function parseQuery() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("category")) state.category = params.get("category");
  if (params.get("new") === "true") state.sort = "newest";
  if (params.get("q")) state.q = params.get("q");
}

// ---------------- Load filters ----------------
async function loadFilters() {
  try {
    const [catData, brandData] = await Promise.all([
      api.get("/api/categories"),
      api.get("/api/brands"),
    ]);
    renderCategoryFilters(catData.categories);
    renderBrandFilters(brandData.brands);
    renderSizeFilters();
    renderColorFilters();
    renderRatingFilters();
  } catch (e) {
    // ignore
  }
}

function renderCategoryFilters(categories) {
  const container = document.getElementById("filter-category");
  if (!container) return;
  const urlCat = state.category;
  container.innerHTML = `
    <label class="filter-option"><input type="checkbox" name="cat" value="" ${!urlCat ? "checked" : ""} onchange="HS.shop.setFilter('category','')"/> All Categories</label>
    ${categories
      .map(
        (c) => `
        <label class="filter-option">
          <input type="checkbox" name="cat" value="${c.slug}" ${urlCat === c.slug ? "checked" : ""} 
                 onchange="HS.shop.setFilter('category','${c.slug}')"/>
          ${c.name}
        </label>`
      )
      .join("")}`;
}

function renderBrandFilters(brands) {
  const container = document.getElementById("filter-brand");
  if (!container) return;
  container.innerHTML = brands
    .map(
      (b) => `
      <label class="filter-option">
        <input type="checkbox" value="${b}" onchange="HS.shop.toggleList('brands','${b}',this)"/>
        ${b}
      </label>`
    )
    .join("");
}

function renderSizeFilters() {
  const container = document.getElementById("filter-size");
  if (!container) return;
  const sizes = ["S", "M", "L", "XL", "XXL", "28", "30", "32", "34", "36", "7", "8", "9", "10", "11"];
  container.innerHTML = sizes
    .map(
      (s) => `
      <label class="filter-option">
        <input type="checkbox" value="${s}" onchange="HS.shop.toggleList('sizes','${s}',this)"/>
        ${s}
      </label>`
    )
    .join("");
}

function renderColorFilters() {
  const container = document.getElementById("filter-color");
  if (!container) return;
  const colors = ["Black", "White", "Blue", "Grey", "Navy", "Olive", "Red", "Brown", "Beige", "Green"];
  container.innerHTML = colors
    .map(
      (c) => `
      <label class="filter-option">
        <input type="checkbox" value="${c}" onchange="HS.shop.toggleList('colors','${c}',this)"/>
        ${c}
      </label>`
    )
    .join("");
}

function renderRatingFilters() {
  const container = document.getElementById("filter-rating");
  if (!container) return;
  [4.5, 4, 3, 0].forEach((r) => {
    const label = r === 0 ? "All Ratings" : `${r}★ & up`;
    container.innerHTML += `
      <label class="filter-option">
        <input type="radio" name="rating" value="${r}" ${state.rating === r ? "checked" : ""} onchange="HS.shop.setFilter('rating',${r})"/>
        ${label}
      </label>`;
  });
}

// ---------------- Price range ----------------
function initPriceRange() {
  const minInput = document.getElementById("price-min");
  const maxInput = document.getElementById("price-max");
  const minLabel = document.getElementById("price-min-label");
  const maxLabel = document.getElementById("price-max-label");
  if (!minInput) return;

  minInput.addEventListener("input", () => {
    if (parseInt(minInput.value) > parseInt(maxInput.value)) return;
    state.min_price = parseInt(minInput.value);
    minLabel.textContent = formatPrice(state.min_price);
    state.page = 1;
    loadProducts();
  });
  maxInput.addEventListener("input", () => {
    if (parseInt(maxInput.value) < parseInt(minInput.value)) return;
    state.max_price = parseInt(maxInput.value);
    maxLabel.textContent = formatPrice(state.max_price);
    state.page = 1;
    loadProducts();
  });
}

// ---------------- Load products ----------------
async function loadProducts() {
  const grid = document.getElementById("shop-products");
  const countEl = document.getElementById("result-count");
  const pagination = document.getElementById("shop-pagination");
  if (!grid) return;

  grid.innerHTML = skeletonGrid(state.limit);
  countEl.textContent = "Loading products...";

  const params = {
    page: state.page,
    limit: state.limit,
    sort: state.sort,
    category: state.category || undefined,
    brand: state.brands.join(",") || undefined,
    size: state.sizes.join(",") || undefined,
    color: state.colors.join(",") || undefined,
    min_price: state.min_price > 0 ? state.min_price : undefined,
    max_price: state.max_price < 6000 ? state.max_price : undefined,
    rating: state.rating > 0 ? state.rating : undefined,
    q: state.q || undefined,
  };

  try {
    const data = await api.get("/api/products", { params });
    state.total = data.total;
    state.pages = data.pages;
    renderProductGrid(grid, data.products);
    countEl.textContent = `Showing ${data.products.length} of ${data.total} products`;
    renderPagination(pagination);
  } catch (e) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>Error</h3><p>Could not load products.</p></div>`;
    countEl.textContent = "Failed to load products.";
  }
}

// ---------------- Pagination ----------------
function renderPagination(container) {
  if (!container) return;
  if (state.pages <= 1) {
    container.innerHTML = "";
    return;
  }
  let html = "";
  html += `<button class="page-btn" ${state.page === 1 ? "disabled" : ""} data-page="${state.page - 1}">‹</button>`;
  for (let i = 1; i <= state.pages; i++) {
    html += `<button class="page-btn ${i === state.page ? "active" : ""}" data-page="${i}">${i}</button>`;
  }
  html += `<button class="page-btn" ${state.page === state.pages ? "disabled" : ""} data-page="${state.page + 1}">›</button>`;
  container.innerHTML = html;
  container.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pg = parseInt(btn.getAttribute("data-page"));
      if (pg && pg >= 1 && pg <= state.pages) {
        state.page = pg;
        loadProducts();
        window.scrollTo({ top: 300, behavior: "smooth" });
      }
    });
  });
}

// ---------------- Sort ----------------
function initSort() {
  const select = document.getElementById("sort-select");
  if (!select) return;
  select.value = state.sort;
  select.addEventListener("change", () => {
    state.sort = select.value;
    state.page = 1;
    loadProducts();
  });
}

// ---------------- Sidebar (mobile) ----------------
function initSidebar() {
  const openBtn = document.querySelector("[data-filter-open]");
  const closeBtn = document.querySelector("[data-filter-close]");
  const sidebar = document.getElementById("shop-sidebar");
  const overlay = document.querySelector("[data-sidebar-overlay]");
  if (!sidebar) return;

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      sidebar.classList.add("open");
      if (overlay) overlay.classList.add("active");
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      sidebar.classList.remove("open");
      if (overlay) overlay.classList.remove("active");
    });
  }
  if (overlay) {
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("active");
    });
  }
}

// ---------------- Expose control functions ----------------
window.HS = window.HS || {};
window.HS.shop = {
  setFilter(key, value) {
    state[key] = value;
    state.page = 1;
    loadProducts();
  },
  toggleList(key, value, checkbox) {
    if (checkbox.checked) {
      state[key].push(value);
    } else {
      state[key] = state[key].filter((v) => v !== value);
    }
    state.page = 1;
    loadProducts();
  },
};

// ---------------- Init ----------------
function initShop() {
  parseQuery();
  loadFilters();
  initPriceRange();
  initSort();
  initSidebar();
  initProductActions();
  initQuickView();
  loadProducts();
}

document.addEventListener("DOMContentLoaded", initShop);
