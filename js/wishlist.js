/* ============================================================
   Honeystreet — Wishlist Script
   ============================================================ */

import { api, isLoggedIn, formatPrice, starsHtml } from "./api.js";
import { addToCart } from "./products.js";

async function loadWishlist() {
  const container = document.getElementById("wishlist-content");
  if (!container) return;

  if (!isLoggedIn()) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🤍</div>
        <h3>Please login to view your wishlist</h3>
        <p>Sign in to see items saved for later.</p>
        <a class="btn btn-primary" href="login.html?redirect=wishlist">Login Now</a>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="loader"></div>`;
  try {
    const data = await api.get("/api/wishlist", { auth: true });
    renderWishlist(data.items || []);
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><h3>Could not load wishlist</h3><p>${e.message}</p></div>`;
  }
}

function renderWishlist(items) {
  const container = document.getElementById("wishlist-content");
  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🤍</div>
        <h3>Your wishlist is empty</h3>
        <p>Save your favourite pieces here.</p>
        <a class="btn btn-primary" href="shop.html">Discover Products</a>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="wishlist-grid">
      ${items.map((item) => `
        <article class="product-card" data-tilt>
          <div class="product-media">
            <a href="product.html?slug=${item.product_id}">
              <img src="${item.image}" alt="${item.name}" loading="lazy"/>
            </a>
            ${item.discount_price ? `<span class="badge-tag badge-discount">Sale</span>` : ""}
            <button class="wishlist-btn active" data-wish-remove="${item.product_id}" title="Remove from wishlist">♥</button>
            <div class="product-quick-actions">
              <button class="btn" data-wish-cart="${item.product_id}">Add to Cart</button>
            </div>
          </div>
          <div class="product-info">
            <span class="product-cat">${item.category || ""}</span>
            <h3 class="product-name"><a href="product.html?slug=${item.product_id}">${item.name}</a></h3>
            <div class="product-price">
              <span class="price">${formatPrice(item.discount_price || item.price)}</span>
              ${item.discount_price ? `<span class="price-old">${formatPrice(item.price)}</span>` : ""}
            </div>
            <div class="product-rating">${starsHtml(item.rating)} <span>(${item.stock > 0 ? "In Stock" : "Out of Stock"})</span></div>
          </div>
        </article>`).join("")}
    </div>`;

  document.querySelectorAll("[data-wish-remove]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const productId = parseInt(btn.getAttribute("data-wish-remove"));
      try {
        const { items } = await api.get("/api/wishlist", { auth: true });
        const existing = items.find((i) => i.product_id === productId);
        if (existing) await api.del(`/api/wishlist/items/${existing.id}`, { auth: true });
        if (window.HS) window.HS.showToast("Removed from wishlist.", "info");
        if (window.HS) window.HS.refreshCounts();
        loadWishlist();
      } catch (e) {
        if (window.HS) window.HS.showToast(e.message, "error");
      }
    });
  });

  document.querySelectorAll("[data-wish-cart]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const productId = parseInt(btn.getAttribute("data-wish-cart"));
      const ok = await addToCart(productId);
      if (ok) {
        try {
          const { items } = await api.get("/api/wishlist", { auth: true });
          const existing = items.find((i) => i.product_id === productId);
          if (existing) await api.del(`/api/wishlist/items/${existing.id}`, { auth: true });
          if (window.HS) window.HS.refreshCounts();
          loadWishlist();
        } catch (e) {}
      }
    });
  });
}

function initWishlist() {
  loadWishlist();
}

document.addEventListener("DOMContentLoaded", initWishlist);
