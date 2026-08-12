/* ============================================================
   Honeystreet — Order Tracking Script
   ============================================================ */

import { api, isLoggedIn, formatPrice } from "./api.js";
import { ORDER_STEPS } from "./order-steps.js";

function getOrderId() {
  return new URLSearchParams(window.location.search).get("order_id");
}

async function loadTracking() {
  const container = document.getElementById("tracking-content");
  if (!container) return;

  if (!isLoggedIn()) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>Please login to track your order</h3>
        <a class="btn btn-primary" href="login.html?redirect=order-tracking.html">Login</a>
      </div>`;
    return;
  }

  const orderId = getOrderId();
  if (!orderId) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>No order specified</h3>
        <a class="btn btn-primary" href="profile.html">View My Orders</a>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="loader"></div>`;
  try {
    const data = await api.get(`/api/orders/${orderId}`, { auth: true });
    renderTracking(data.order);
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><h3>Order not found</h3><p>${e.message}</p></div>`;
  }
}

function renderTracking(order) {
  const container = document.getElementById("tracking-content");
  const currentStatus = order.order_status;
  const currentIdx = ORDER_STEPS.indexOf(currentStatus);

  const statusClass = (status) => {
    const cls = status.toLowerCase().replace(/ /g, "-");
    return `status-badge ${cls}`;
  };

  container.innerHTML = `
    <div class="order-card">
      <div class="order-card-head">
        <div>
          <div class="order-id">Order #${order.order_id}</div>
          <div style="color:var(--text-muted);font-size:0.85rem">Placed on ${new Date(order.created_at).toLocaleDateString()}</div>
        </div>
        <div>
          <span class="${statusClass(order.order_status)}">${order.order_status}</span>
          <span class="status-badge order-placed" style="margin-left:8px">${order.payment_status}</span>
        </div>
      </div>

      <div class="order-items">
        ${order.items.map((i) => `
          <div class="order-item">
            <img src="${i.image}" alt="${i.name}"/>
            <div>
              <div class="oi-name">${i.name}</div>
              <div class="oi-meta">Qty: ${i.quantity} ${i.size ? `· Size: ${i.size}` : ""} ${i.color ? `· Color: ${i.color}` : ""}</div>
            </div>
            <div style="margin-left:auto;font-weight:700">${formatPrice(i.total)}</div>
          </div>`).join("")}
      </div>

      <div class="flex-between wrap" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
        <div>
          <div style="color:var(--text-muted);font-size:0.85rem">Payment Method</div>
          <strong>${order.payment_method}</strong>
        </div>
        <div>
          <div style="color:var(--text-muted);font-size:0.85rem">Total Paid</div>
          <strong style="font-size:1.2rem">${formatPrice(order.total)}</strong>
        </div>
      </div>
    </div>

    <div class="tracking">
      <h3 style="font-family:var(--font-body);margin-bottom:8px">Order Timeline</h3>
      <div class="tracking-timeline">
        ${ORDER_STEPS.map((step, idx) => `
          <div class="tracking-step ${idx < currentIdx ? "done" : idx === currentIdx ? "current" : ""}">
            <div class="dot"></div>
            <div class="label">${step}</div>
          </div>`).join("")}
      </div>
    </div>

    <div style="text-align:center;margin-top:30px">
      <a class="btn btn-outline" href="profile.html">Back to My Orders</a>
      <a class="btn btn-primary" href="shop.html" style="margin-left:10px">Continue Shopping</a>
    </div>`;
}

document.addEventListener("DOMContentLoaded", loadTracking);
