/* ============================================================
   Honeystreet — Search Results Script
   ============================================================ */

import { api } from "./api.js";
import { renderProductGrid, skeletonGrid, initProductActions, initQuickView } from "./products.js";

let state = { q: "", page: 1, pages: 1 };

async function loadSearch() {
  const grid = document.getElementById("search-results");
  const count = document.getElementById("search-count");
  const pagination = document.getElementById("search-pagination");
  if (!grid) return;

  state.q = new URLSearchParams(window.location.search).get("q") || "";
  if (!state.q) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><h3>Enter a search term</h3><a class="btn btn-primary" href="shop.html">Browse Shop</a></div>`;
    count.textContent = "";
    return;
  }

  document.title = `Search: ${state.q} — Honeystreet`;
  grid.innerHTML = skeletonGrid(9);
  count.textContent = `Searching for "${state.q}"...`;

  try {
    const data = await api.get("/api/products", { params: { q: state.q, page: state.page, limit: 9 } });
    state.pages = data.pages;
    renderProductGrid(grid, data.products);
    count.textContent = `Found ${data.total} result${data.total === 1 ? "" : "s"} for "${state.q}"`;
    renderPagination(pagination);
    initProductActions();
    initQuickView();
  } catch (e) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>Search failed</h3><p>${e.message}</p></div>`;
    count.textContent = "";
  }
}

function renderPagination(container) {
  if (!container) return;
  if (state.pages <= 1) {
    container.innerHTML = "";
    return;
  }
  let html = "";
  for (let i = 1; i <= state.pages; i++) {
    html += `<button class="page-btn ${i === state.page ? "active" : ""}" data-search-page="${i}">${i}</button>`;
  }
  container.innerHTML = html;
  container.querySelectorAll("[data-search-page]").forEach((b) => {
    b.addEventListener("click", () => {
      state.page = parseInt(b.getAttribute("data-search-page"));
      loadSearch();
      window.scrollTo({ top: 300, behavior: "smooth" });
    });
  });
}

document.addEventListener("DOMContentLoaded", loadSearch);
