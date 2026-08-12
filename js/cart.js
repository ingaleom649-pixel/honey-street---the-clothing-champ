/* ============================================================
   Honeystreet — Cart Script
   Render cart items, update quantity, remove, apply coupon, totals.
   ============================================================ */

import { api, isLoggedIn, formatPrice } from "./api.js";

let couponCode = "";

async function loadCart() {
  const container = document.getElementById("cart-content");
  if (!container) return;

  if (!isLoggedIn()) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🛒</div>
        <h3>Please login to view your cart</h3>
        <p>Sign in to see items saved to your cart.</p>
        <a class="btn btn-primary" href="login.html?redirect=cart">Login Now</a>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="loader"></div>`;
  try {
    const data = await api.get("/api/cart", { auth: true });
    renderCart(data);
  } catch (e) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>Could not load cart</h3><p>${e.message}</p></div>`;
  }
}

function renderCart(cart) {
  const container = document.getElementById("cart-content");
  if (cart.count === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Looks like you haven't added anything yet.</p>
        <a class="btn btn-primary" href="shop.html">Start Shopping</a>
      </div>`;
    return;
  }

  const couponDiscount = cart.coupon_discount || 0;
  const finalTotal = cart.total;

  container.innerHTML = `
    <div class="cart-items">
      ${cart.items.map((item) => `
        <div class="cart-item" data-cart-item="${item.id}">
          <a href="product.html?slug=${item.product_id}">
            <img src="${item.image}" alt="${item.name}"/>
          </a>
          <div class="cart-item-info">
            <h4><a href="product.html?id=${item.product_id}">${item.name}</a></h4>
            <div class="variant">${item.size ? `Size: ${item.size}` : ""} ${item.color ? `· Color: ${item.color}` : ""}</div>
            <div class="cart-item-price">${formatPrice(item.unit_price)}</div>
          </div>
          <div class="cart-item-right">
            <button class="remove-btn" data-remove="${item.id}">✕ Remove</button>
            <div class="qty-control">
              <button data-qty-minus="${item.id}">−</button>
              <input type="number" value="${item.quantity}" min="1" max="${item.stock || 99}" data-qty-input="${item.id}"/>
              <button data-qty-plus="${item.id}">+</button>
            </div>
            <div class="cart-item-price">${formatPrice(item.subtotal)}</div>
          </div>
        </div>`).join("")}
      <a class="btn btn-outline" href="shop.html" style="align-self:flex-start">← Continue Shopping</a>
    </div>

    <div class="order-summary">
      <h3>Order Summary</h3>
      <div class="coupon-box">
        <input type="text" placeholder="Coupon code" value="${couponCode}" id="coupon-input"/>
        <button class="btn btn-outline btn-sm" id="apply-coupon">Apply</button>
      </div>
      ${couponDiscount ? `
        <div class="coupon-applied">
          <span>Coupon ${couponCode} applied (−${formatPrice(couponDiscount)})</span>
          <button data-remove-coupon>Remove</button>
        </div>` : ""}

      <div class="summary-row"><span>Subtotal</span><span>${formatPrice(cart.subtotal)}</span></div>
      <div class="summary-row discount"><span>Product Discount</span><span>−${formatPrice(cart.discount)}</span></div>
      ${couponDiscount ? `<div class="summary-row discount"><span>Coupon (${couponCode})</span><span>−${formatPrice(couponDiscount)}</span></div>` : ""}
      <div class="summary-row"><span>Shipping</span><span>${cart.shipping === 0 ? "FREE" : formatPrice(cart.shipping)}</span></div>
      <div class="summary-row total"><span>Total</span><span>${formatPrice(finalTotal)}</span></div>
      <a class="btn btn-gold btn-block" href="checkout.html" style="margin-top:20px">Proceed to Checkout</a>
    </div>`;

  initCartActions(cart);
}

function initCartActions(cart) {
  // Remove
  document.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-remove");
      try {
        await api.del(`/api/cart/items/${id}`, { auth: true });
        if (window.HS) window.HS.showToast("Removed from cart.", "info");
        if (window.HS) window.HS.refreshCounts();
        loadCart();
      } catch (e) {
        if (window.HS) window.HS.showToast(e.message, "error");
      }
    });
  });

  // Quantity
  document.querySelectorAll("[data-qty-minus]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-qty-minus");
      const item = cart.items.find((i) => i.id === parseInt(id));
      if (item && item.quantity > 1) {
        await updateQty(id, item.quantity - 1);
      }
    });
  });
  document.querySelectorAll("[data-qty-plus]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-qty-plus");
      const item = cart.items.find((i) => i.id === parseInt(id));
      if (item && item.quantity < item.stock) {
        await updateQty(id, item.quantity + 1);
      } else {
        if (window.HS) window.HS.showToast("Max quantity reached.", "warning");
      }
    });
  });
  document.querySelectorAll("[data-qty-input]").forEach((input) => {
    input.addEventListener("change", async () => {
      const id = input.getAttribute("data-qty-input");
      const val = Math.max(1, parseInt(input.value) || 1);
      await updateQty(id, val);
    });
  });

  // Coupon
  const applyBtn = document.getElementById("apply-coupon");
  if (applyBtn) {
    applyBtn.addEventListener("click", async () => {
      const input = document.getElementById("coupon-input");
      couponCode = input.value.trim().toUpperCase();
      if (!couponCode) {
        if (window.HS) window.HS.showToast("Enter a coupon code.", "warning");
        return;
      }
try {
        const res = await api.post("/api/cart/apply-coupon", { code: couponCode }, { auth: true });
        if (window.HS) window.HS.showToast(res.message || "Coupon applied!", "success");
        loadCart();
      } catch (e) {
        if (window.HS) window.HS.showToast(e.message, "error");
      }
    });
  }

  // Remove coupon
  const removeCoupon = document.querySelector("[data-remove-coupon]");
  if (removeCoupon) {
    removeCoupon.addEventListener("click", async () => {
couponCode = "";
      try {
        await api.post("/api/cart/remove-coupon", {}, { auth: true });
        loadCart();
      } catch (e) {
        if (window.HS) window.HS.showToast(e.message, "error");
      }
    });
  }
}

async function updateQty(id, qty) {
  try {
    await api.put(`/api/cart/items/${id}`, { quantity: qty }, { auth: true });
    if (window.HS) window.HS.refreshCounts();
    loadCart();
  } catch (e) {
    if (window.HS) window.HS.showToast(e.message, "error");
  }
}

function initCart() {
  loadCart();
}

document.addEventListener("DOMContentLoaded", initCart);
