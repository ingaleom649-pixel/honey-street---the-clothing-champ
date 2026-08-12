/* ============================================================
   Honeystreet — Products Helpers
   Renders product cards used across homepage, shop, wishlist.
   Also handles quick-view modal and add-to-cart / wishlist.
   ============================================================ */

import { api, isLoggedIn, getUser, formatPrice, starsHtml } from "./api.js";

// Toast helper (exposed globally by main.js); fallback to console
function showToast(message, type = "info") {
  if (window.HS && window.HS.showToast) {
    window.HS.showToast(message, type);
  } else {
    console.log(`[${type}] ${message}`);
  }
}

// Build a product card element
export function productCardHtml(p) {
  const price = p.discount_price || p.price;
  const oldPrice = p.discount_price ? p.price : null;
  const badges = [];
  if (p.is_new) badges.push('<span class="badge-tag badge-new">New</span>');
  if (p.discount_percent > 0) badges.push(`<span class="badge-tag badge-discount">-${p.discount_percent}%</span>`);
  if (p.is_trending) badges.push('<span class="badge-tag badge-trending">Trending</span>');

  return `
  <article class="product-card" data-tilt data-product-id="${p.id}">
    <div class="product-media">
      <a href="product.html?slug=${p.slug}">
        <img src="${p.image}" alt="${p.name}" loading="lazy"/>
      </a>
      ${badges.join("")}
      <button class="wishlist-btn" data-wishlist-toggle="${p.id}" title="Add to wishlist" aria-label="Wishlist">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
      <div class="product-quick-actions">
        <button class="btn" data-quick-view="${p.id}">Quick View</button>
        <button class="btn" data-add-cart="${p.id}">Add to Cart</button>
      </div>
    </div>
    <div class="product-info">
      <span class="product-cat">${p.category || ""}</span>
      <h3 class="product-name"><a href="product.html?slug=${p.slug}">${p.name}</a></h3>
      <div class="product-price">
        <span class="price">${formatPrice(price)}</span>
        ${oldPrice ? `<span class="price-old">${formatPrice(oldPrice)}</span>` : ""}
        ${p.discount_percent > 0 ? `<span class="price-off">${p.discount_percent}% off</span>` : ""}
      </div>
      <div class="product-rating">
        ${starsHtml(p.rating)}
        <span>(${p.rating_count || 0})</span>
      </div>
    </div>
  </article>`;
}

// Render product grid
export function renderProductGrid(container, products) {
  if (!container) return;
  if (!products || products.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🛍️</div>
        <h3>No products found</h3>
        <p>Try adjusting your filters or search.</p>
      </div>`;
    return;
  }
  container.innerHTML = products.map(productCardHtml).join("");
}

// Skeleton loader for product grid
export function skeletonGrid(count = 8) {
  let html = "";
  for (let i = 0; i < count; i++) {
    html += `
      <div class="product-card">
        <div class="product-media">
          <div class="skeleton" style="width:100%;height:100%;border-radius:0"></div>
        </div>
        <div class="product-info">
          <div class="skeleton" style="height:14px;width:70%"></div>
          <div class="skeleton" style="height:18px;width:90%"></div>
          <div class="skeleton" style="height:14px;width:50%"></div>
        </div>
      </div>`;
  }
  return html;
}

// Add to cart (global handler)
export async function addToCart(productId, quantity = 1, size = "", color = "") {
  if (!isLoggedIn()) {
    showToast("Please login to add items to your cart.", "warning");
    setTimeout(() => (window.location.href = "login.html?redirect=cart"), 700);
    return false;
  }
  try {
    const data = await api.post(
      "/api/cart/items",
      { product_id: productId, quantity, size: size || null, color: color || null },
      { auth: true }
    );
    showToast("Added to cart!", "success");
    if (window.HS) window.HS.refreshCounts();
    if (window.HS.updateCartUI) window.HS.updateCartUI(data.cart);
    return true;
  } catch (e) {
    showToast(e.message || "Could not add to cart.", "error");
    return false;
  }
}

// Toggle wishlist
export async function toggleWishlist(productId, btn = null) {
  if (!isLoggedIn()) {
    showToast("Please login to use your wishlist.", "warning");
    setTimeout(() => (window.location.href = "login.html?redirect=shop"), 700);
    return;
  }
  try {
    // Try remove first (if in wishlist) by fetching list
    const { items } = await api.get("/api/wishlist", { auth: true });
    const existing = items.find((i) => i.product_id === productId);
    if (existing) {
      await api.del(`/api/wishlist/items/${existing.id}`, { auth: true });
      showToast("Removed from wishlist.", "info");
      if (btn) btn.classList.remove("active");
    } else {
      await api.post("/api/wishlist/items", { product_id: productId }, { auth: true });
      showToast("Added to wishlist!", "success");
      if (btn) btn.classList.add("active");
    }
    if (window.HS) window.HS.refreshCounts();
    if (window.HS.loadWishlist) window.HS.loadWishlist();
  } catch (e) {
    showToast(e.message || "Could not update wishlist.", "error");
  }
}

// Quick view modal
export function initQuickView() {
  document.addEventListener("click", async (e) => {
    const qvBtn = e.target.closest("[data-quick-view]");
    if (!qvBtn) return;
    const id = qvBtn.getAttribute("data-quick-view");
    try {
      const data = await api.get(`/api/products/${id}`);
      openQuickView(data.product);
    } catch (err) {
      showToast("Could not load product.", "error");
    }
  });
}

function openQuickView(product) {
  let overlay = document.getElementById("quick-view-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "quick-view-overlay";
    overlay.className = "modal-overlay";
    document.body.appendChild(overlay);
  }
  const price = product.discount_price || product.price;
  overlay.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" data-qv-close>✕</button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;" class="qv-grid">
        <img src="${product.image}" alt="${product.name}" style="width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:12px;"/>
        <div>
          <span class="product-cat">${product.category || ""}</span>
          <h2 style="font-size:1.6rem;margin:8px 0;">${product.name}</h2>
          <div class="product-rating" style="margin-bottom:12px;">${starsHtml(product.rating)} <span>(${product.rating_count || 0})</span></div>
          <div class="product-price" style="font-size:1.3rem;margin-bottom:12px;">
            <span class="price">${formatPrice(price)}</span>
            ${product.discount_price ? `<span class="price-old">${formatPrice(product.price)}</span>` : ""}
          </div>
          <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:16px;">${product.description}</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-primary" data-qv-add="${product.id}">Add to Cart</button>
            <a class="btn btn-outline" href="product.html?slug=${product.slug}">View Details</a>
          </div>
        </div>
      </div>
    </div>`;
  overlay.classList.add("active");

  const close = () => overlay.classList.remove("active");
  overlay.querySelector("[data-qv-close]").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector("[data-qv-add]").addEventListener("click", () => {
    addToCart(product.id);
  });

  // Responsive grid
  if (window.innerWidth <= 640) {
    const grid = overlay.querySelector(".qv-grid");
    grid.style.gridTemplateColumns = "1fr";
  }
}

// Global delegation for wishlist & add-to-cart buttons across rendered cards
export function initProductActions() {
  document.addEventListener("click", (e) => {
    const wishBtn = e.target.closest("[data-wishlist-toggle]");
    if (wishBtn) {
      e.preventDefault();
      toggleWishlist(wishBtn.getAttribute("data-wishlist-toggle"), wishBtn);
      return;
    }
    const addBtn = e.target.closest("[data-add-cart]");
    if (addBtn) {
      e.preventDefault();
      addToCart(addBtn.getAttribute("data-add-cart"));
    }
  });
}

export { showToast };
