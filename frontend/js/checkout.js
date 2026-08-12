/* ============================================================
   Honeystreet — Checkout Script
   1. Shipping address  2. Payment method  3. Summary  4. Place order
   ============================================================ */

import { api, isLoggedIn, getUser, formatPrice } from "./api.js";

let cartData = null;
let userData = null;

async function initCheckout() {
  const container = document.getElementById("checkout-content");
  if (!container) return;

  if (!isLoggedIn()) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🔒</div>
        <h3>Login to Checkout</h3>
        <p>Please login or create an account to place your order.</p>
        <div class="flex-center gap-3 wrap" style="margin-top:10px">
          <a class="btn btn-primary" href="login.html?redirect=checkout">Login</a>
          <a class="btn btn-outline" href="register.html">Create Account</a>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="loader"></div>`;

  try {
    const [cartRes, userRes] = await Promise.all([
      api.get("/api/cart", { auth: true }),
      api.get("/api/profile", { auth: true }),
    ]);
    cartData = cartRes;
    userData = userRes.user || userRes;
    if (cartData.count === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <a class="btn btn-primary" href="shop.html">Go Shopping</a>
        </div>`;
      return;
    }
    renderCheckout();
  } catch (e) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>Could not load checkout</h3><p>${e.message}</p></div>`;
  }
}

function renderCheckout() {
  const container = document.getElementById("checkout-content");
  const couponDiscount = cartData.coupon_discount || 0;

  container.innerHTML = `
    <form class="checkout-form" id="checkout-form">
      <h3><span class="step-num">1</span> Shipping Address</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Full Name</label>
          <input class="form-control" id="addr-name" value="${userData.full_name || ""}" required/>
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input class="form-control" id="addr-phone" value="${userData.phone || ""}" required/>
        </div>
      </div>
      <div class="form-group">
        <label>Address Line 1</label>
        <input class="form-control" id="addr-line1" placeholder="House no, Street" required/>
      </div>
      <div class="form-group">
        <label>Address Line 2 (Optional)</label>
        <input class="form-control" id="addr-line2" placeholder="Area, Landmark"/>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>City</label>
          <input class="form-control" id="addr-city" required/>
        </div>
        <div class="form-group">
          <label>State</label>
          <input class="form-control" id="addr-state" required/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Postal Code</label>
          <input class="form-control" id="addr-zip" required/>
        </div>
        <div class="form-group">
          <label>Country</label>
          <input class="form-control" id="addr-country" value="India" required/>
        </div>
      </div>

      <h3 style="margin-top:30px"><span class="step-num">2</span> Payment Method</h3>
      <div class="payment-options">
        <label class="payment-option selected">
          <input type="radio" name="payment" value="COD" checked/>
          <div><strong>Cash on Delivery</strong><div style="color:var(--text-muted);font-size:0.85rem">Pay when your order arrives</div></div>
        </label>
        <label class="payment-option">
          <input type="radio" name="payment" value="ONLINE"/>
          <div><strong>Online Payment</strong><div style="color:var(--text-muted);font-size:0.85rem">Razorpay / UPI / Cards (coming soon)</div></div>
        </label>
      </div>

      <button class="btn btn-gold btn-block" type="submit" style="margin-top:24px">Place Order • ${formatPrice(cartData.total)}</button>
    </form>

    <div class="order-summary">
      <h3>Order Summary</h3>
      ${cartData.items.map((i) => `
        <div class="summary-row"><span>${i.name} × ${i.quantity}</span><span>${formatPrice(i.subtotal)}</span></div>`).join("")}
      <div class="summary-row"><span>Subtotal</span><span>${formatPrice(cartData.subtotal)}</span></div>
      <div class="summary-row discount"><span>Product Discount</span><span>−${formatPrice(cartData.discount)}</span></div>
      ${couponDiscount ? `<div class="summary-row discount"><span>Coupon</span><span>−${formatPrice(couponDiscount)}</span></div>` : ""}
      <div class="summary-row"><span>Shipping</span><span>${cartData.shipping === 0 ? "FREE" : formatPrice(cartData.shipping)}</span></div>
      <div class="summary-row total"><span>Total</span><span>${formatPrice(cartData.total)}</span></div>
    </div>`;

  // Payment selection
  document.querySelectorAll(".payment-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      document.querySelectorAll(".payment-option").forEach((o) => o.classList.remove("selected"));
      opt.classList.add("selected");
      opt.querySelector("input").checked = true;
    });
  });

  // Submit
  document.getElementById("checkout-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const address = {
      full_name: document.getElementById("addr-name").value.trim(),
      phone: document.getElementById("addr-phone").value.trim(),
      line1: document.getElementById("addr-line1").value.trim(),
      line2: document.getElementById("addr-line2").value.trim(),
      city: document.getElementById("addr-city").value.trim(),
      state: document.getElementById("addr-state").value.trim(),
      postal_code: document.getElementById("addr-zip").value.trim(),
      country: document.getElementById("addr-country").value.trim(),
    };
    const payment = document.querySelector('input[name="payment"]:checked').value;

    if (!address.full_name || !address.phone || !address.line1 || !address.city || !address.state || !address.postal_code) {
      if (window.HS) window.HS.showToast("Please fill all required fields.", "error");
      return;
    }

    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Placing Order...";

    try {
const res = await api.post("/api/orders", { shipping_address: address, payment_method: payment }, { auth: true });
      if (window.HS) window.HS.showToast("Order placed successfully! 🎉", "success");
      if (window.HS) window.HS.refreshCounts();
      window.location.href = `order-tracking.html?order_id=${res.order.order_id}`;
    } catch (err) {
      btn.disabled = false;
      btn.textContent = `Place Order • ${formatPrice(cartData.total)}`;
      if (window.HS) window.HS.showToast(err.message, "error");
    }
  });
}

document.addEventListener("DOMContentLoaded", initCheckout);
