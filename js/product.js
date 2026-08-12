/* ============================================================
   Honeystreet — Product Detail Script
   Gallery, zoom, size/color selection, quantity, add to cart,
   buy now, reviews, related products.
   ============================================================ */

import { api, isLoggedIn, getUser, formatPrice, starsHtml } from "./api.js";
import { renderProductGrid, initProductActions, initQuickView, addToCart, toggleWishlist } from "./products.js";

let currentProduct = null;
let selectedSize = "";
let selectedColor = "";
let quantity = 1;

function getSlug() {
  return new URLSearchParams(window.location.search).get("slug");
}

async function loadProduct() {
  const container = document.getElementById("product-detail");
  const slug = getSlug();
  if (!slug) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>No product specified</h3></div>`;
    return;
  }
  container.innerHTML = `<div class="loader"></div>`;
  try {
    const data = await api.get(`/api/products/${slug}`);
    currentProduct = data.product;
    selectedSize = currentProduct.sizes[0] || "";
    selectedColor = currentProduct.colors[0] || "";
    renderProduct(currentProduct);
    loadReviews(currentProduct.id);
    loadRelated(currentProduct.id);
  } catch (e) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>Product not found</h3><p>${e.message}</p></div>`;
  }
}

function renderProduct(p) {
  const container = document.getElementById("product-detail");
  const images = p.images && p.images.length ? p.images : [p.image];
  const price = p.discount_price || p.price;
  const stockClass = p.stock > 20 ? "stock-in" : p.stock > 0 ? "stock-low" : "stock-out";
  const stockText = p.stock > 20 ? "In Stock" : p.stock > 0 ? `Only ${p.stock} left` : "Out of Stock";

  container.innerHTML = `
    <div class="pd-gallery">
      <div class="pd-main-img" data-main-img>
        <img src="${images[0]}" alt="${p.name}" id="pd-main"/>
      </div>
      <div class="pd-thumbs" id="pd-thumbs">
        ${images.map((img, i) => `<div class="pd-thumb ${i === 0 ? "active" : ""}" data-thumb="${i}"><img src="${img}" alt="${p.name} ${i + 1}"/></div>`).join("")}
      </div>
    </div>

    <div class="pd-info">
      <span class="product-cat">${p.category || ""} · ${p.brand}</span>
      <h1>${p.name}</h1>
      <div class="pd-rating">
        ${starsHtml(p.rating)}
        <span>${p.rating} (${p.rating_count || 0} reviews)</span>
        <a class="rev-link" href="#reviews-section">View reviews</a>
      </div>
      <div class="pd-price">
        <span class="price">${formatPrice(price)}</span>
        ${p.discount_price ? `<span class="price-old">${formatPrice(p.price)}</span><span class="price-off">${p.discount_percent}% OFF</span>` : ""}
      </div>
      <p class="pd-desc">${p.description}</p>

      <div class="pd-options">
        <div class="option-label">Size: <span class="sel" id="size-label">${selectedSize}</span></div>
        <div class="size-options" id="size-options">
          ${p.sizes.map((s) => `<button class="size-chip ${s === selectedSize ? "active" : ""}" data-size="${s}">${s}</button>`).join("")}
        </div>
      </div>

      <div class="pd-options">
        <div class="option-label">Color: <span class="sel" id="color-label">${selectedColor}</span></div>
        <div class="color-options" id="color-options">
          ${p.colors.map((c) => `<button class="color-chip ${c === selectedColor ? "active" : ""}" style="background:${colorMap(c)}" title="${c}" data-color="${c}"></button>`).join("")}
        </div>
      </div>

      <div class="pd-quantity">
        <span class="option-label" style="margin:0">Quantity</span>
        <div class="qty-control">
          <button data-qty-minus>−</button>
          <input type="number" value="${quantity}" min="1" max="${Math.max(p.stock, 1)}" data-qty-input/>
          <button data-qty-plus>+</button>
        </div>
      </div>

      <div class="stock-msg ${stockClass}">
        ${p.stock > 0 ? "●" : "✕"} ${stockText}
      </div>

      <div class="pd-cta">
        <button class="btn btn-primary" data-add-detail ${p.stock <= 0 ? "disabled" : ""}>Add to Cart</button>
        <button class="btn btn-gold" data-buy-now ${p.stock <= 0 ? "disabled" : ""}>Buy Now</button>
        <button class="btn btn-outline" data-wish-detail>♡ Wishlist</button>
      </div>

      <div class="pd-meta">
        <div class="pd-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          <div><strong>Free Delivery</strong>Free shipping on orders above ₹999</div>
        </div>
        <div class="pd-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          <div><strong>7-Day Returns</strong>Easy returns and exchanges</div>
        </div>
        <div class="pd-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          <div><strong>Fast Dispatch</strong>Ships within 24 hours</div>
        </div>
      </div>
    </div>`;

  initGallery(images);
  initDetailActions(p);
}

function colorMap(color) {
  const map = {
    black: "#111", white: "#fff", grey: "#888", navy: "#1b2a4a", olive: "#556b2f",
    red: "#c0392b", brown: "#5d4037", beige: "#d7c9a8", green: "#2d6a4f", blue: "#1e3a8a",
    floral: "#f29bb0", rose: "#e75480", maroon: "#800020", emerald: "#046307", pink: "#f8bbd0",
    cream: "#fff8e7",
  };
  return map[color.toLowerCase()] || "#999";
}

function initGallery(images) {
  const main = document.getElementById("pd-main");
  const mainWrap = document.querySelector("[data-main-img]");
  document.querySelectorAll("[data-thumb]").forEach((th) => {
    th.addEventListener("click", () => {
      const idx = parseInt(th.getAttribute("data-thumb"));
      main.src = images[idx];
      document.querySelectorAll("[data-thumb]").forEach((t) => t.classList.remove("active"));
      th.classList.add("active");
    });
  });
  // Zoom
  mainWrap.addEventListener("click", () => {
    mainWrap.classList.toggle("zoomed");
  });
}

function initDetailActions(p) {
  // Size
  document.querySelectorAll("[data-size]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedSize = btn.getAttribute("data-size");
      document.querySelectorAll("[data-size]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("size-label").textContent = selectedSize;
    });
  });
  // Color
  document.querySelectorAll("[data-color]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedColor = btn.getAttribute("data-color");
      document.querySelectorAll("[data-color]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("color-label").textContent = selectedColor;
    });
  });
  // Quantity
  const qtyInput = document.querySelector("[data-qty-input]");
  document.querySelector("[data-qty-minus]").addEventListener("click", () => {
    quantity = Math.max(1, quantity - 1);
    qtyInput.value = quantity;
  });
  document.querySelector("[data-qty-plus]").addEventListener("click", () => {
    quantity = Math.min(Math.max(p.stock, 1), quantity + 1);
    qtyInput.value = quantity;
  });
  qtyInput.addEventListener("change", () => {
    quantity = Math.max(1, Math.min(Math.max(p.stock, 1), parseInt(qtyInput.value) || 1));
    qtyInput.value = quantity;
  });

  // Add to cart
  document.querySelector("[data-add-detail]").addEventListener("click", async () => {
    const ok = await addToCart(p.id, quantity, selectedSize, selectedColor);
    if (ok) {
      const cartBtn = document.querySelector("[data-add-detail]");
      cartBtn.textContent = "Added ✓";
      setTimeout(() => (cartBtn.textContent = "Add to Cart"), 1500);
    }
  });

  // Buy now
  document.querySelector("[data-buy-now]").addEventListener("click", async () => {
    const ok = await addToCart(p.id, quantity, selectedSize, selectedColor);
    if (ok) window.location.href = "checkout.html";
  });

  // Wishlist
  document.querySelector("[data-wish-detail]").addEventListener("click", () => {
    toggleWishlist(p.id);
  });
}

// ---------------- Reviews ----------------
async function loadReviews(productId) {
  const section = document.getElementById("reviews-section");
  try {
    const [{ reviews }, { product }] = await Promise.all([
      api.get(`/api/products/${productId}/reviews`),
      api.get(`/api/products/${productId}`),
    ]);
    const rating = product.rating || 0;
    section.innerHTML = `
      <div class="reviews-head">
        <div class="reviews-summary">
          <span class="big-rating">${rating.toFixed(1)}</span>
          <div>
            ${starsHtml(rating)}
            <div style="color:var(--text-muted);font-size:0.85rem;">Based on ${reviews.length} reviews</div>
          </div>
        </div>
        <button class="btn btn-outline" data-open-review>Write a Review</button>
      </div>

      <div class="review-form hidden" id="review-form-box">
        <h3 style="font-family:var(--font-body);margin-bottom:16px;">Write a Review</h3>
        <div class="form-group">
          <label>Your Rating</label>
          <div class="rating-input" id="rating-input">
            <span class="star" data-star="1">★</span>
            <span class="star" data-star="2">★</span>
            <span class="star" data-star="3">★</span>
            <span class="star" data-star="4">★</span>
            <span class="star" data-star="5">★</span>
          </div>
        </div>
        <div class="form-group">
          <label>Title</label>
          <input class="form-control" id="review-title" placeholder="Great product!" />
        </div>
        <div class="form-group">
          <label>Review</label>
          <textarea class="form-control" id="review-text" placeholder="Share your experience..."></textarea>
        </div>
        <button class="btn btn-primary" data-submit-review>Submit Review</button>
      </div>

      <div class="review-grid" id="reviews-list">
        ${reviews.length === 0 ? `<div class="empty-state" style="grid-column:1/-1"><p>No reviews yet. Be the first!</p></div>` :
        reviews.map((r) => `
          <div class="review-card">
            <div class="review-head">
              <div class="avatar-init">${r.user_name.charAt(0)}</div>
              <div><h4>${r.user_name}</h4><span class="role">${r.title || "Verified Purchase"}</span></div>
            </div>
            <div class="stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
            <p>${r.comment}</p>
          </div>`).join("")}
      </div>`;

    let reviewRating = 5;
    document.querySelector("[data-open-review]").addEventListener("click", () => {
      if (!isLoggedIn()) {
        if (window.HS) window.HS.showToast("Please login to review.", "warning");
        setTimeout(() => (window.location.href = "login.html"), 700);
        return;
      }
      document.getElementById("review-form-box").classList.toggle("hidden");
    });
    document.querySelectorAll("[data-star]").forEach((s) => {
      s.addEventListener("click", () => {
        reviewRating = parseInt(s.getAttribute("data-star"));
        document.querySelectorAll("[data-star]").forEach((x) => x.classList.toggle("active", parseInt(x.getAttribute("data-star")) <= reviewRating));
      });
    });
    document.querySelector("[data-submit-review]").addEventListener("click", async () => {
      const comment = document.getElementById("review-text").value.trim();
      const title = document.getElementById("review-title").value.trim();
      if (!comment) {
        if (window.HS) window.HS.showToast("Please write a review.", "error");
        return;
      }
      try {
        await api.post(`/api/products/${productId}/reviews`, { rating: reviewRating, title, comment }, { auth: true });
        if (window.HS) window.HS.showToast("Review submitted!", "success");
        loadReviews(productId);
      } catch (e) {
        if (window.HS) window.HS.showToast(e.message, "error");
      }
    });
  } catch (e) {
    section.innerHTML = "";
  }
}

// ---------------- Related ----------------
async function loadRelated(productId) {
  const grid = document.getElementById("related-products");
  try {
    const data = await api.get(`/api/products/${productId}/related`);
    renderProductGrid(grid, data.products);
    initProductActions();
    initQuickView();
  } catch (e) {
    grid.innerHTML = "";
  }
}

// ---------------- Init ----------------
function initProduct() {
  loadProduct();
}

document.addEventListener("DOMContentLoaded", initProduct);
