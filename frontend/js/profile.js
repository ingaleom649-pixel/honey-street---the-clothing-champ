/* ============================================================
   Honeystreet — Profile Script
   Overview, edit profile, change password, orders, addresses.
   ============================================================ */

import { api, isLoggedIn, formatPrice } from "./api.js";

let user = null;
let activeTab = "overview";

async function loadProfile() {
  const container = document.getElementById("profile-content");
  if (!container) return;

  if (!isLoggedIn()) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👤</div>
        <h3>Please login to view your profile</h3>
        <a class="btn btn-primary" href="login.html?redirect=profile">Login</a>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="loader"></div>`;
  try {
    const data = await api.get("/api/profile", { auth: true });
    user = data.user;
    renderProfile();
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><h3>Could not load profile</h3><p>${e.message}</p></div>`;
  }
}

function renderProfile() {
  const container = document.getElementById("profile-content");
  const initial = (user.full_name || "U").charAt(0).toUpperCase();

  container.innerHTML = `
    <div class="profile-layout">
      <aside class="profile-sidebar">
        <div class="user-avatar">
          <div class="avatar-circle">${initial}</div>
          <h4 style="font-family:var(--font-body)">${user.full_name}</h4>
          <span style="color:var(--text-muted);font-size:0.85rem">${user.email}</span>
        </div>
        <div class="profile-nav">
          <button data-tab="overview" class="${activeTab === "overview" ? "active" : ""}">📋 Overview</button>
          <button data-tab="orders" class="${activeTab === "orders" ? "active" : ""}">📦 My Orders</button>
          <button data-tab="wishlist" class="${activeTab === "wishlist" ? "active" : ""}">🤍 Wishlist</button>
          <button data-tab="addresses" class="${activeTab === "addresses" ? "active" : ""}">📍 Addresses</button>
          <button data-tab="edit" class="${activeTab === "edit" ? "active" : ""}">✏️ Edit Profile</button>
          <button data-tab="password" class="${activeTab === "password" ? "active" : ""}">🔒 Change Password</button>
          ${user.role === "admin" ? `<button data-tab="admin">🛠 Admin Dashboard</button>` : ""}
          <button data-tab="logout">🚪 Logout</button>
        </div>
      </aside>

      <div class="profile-panel" id="profile-panel">
        <!-- Tab content -->
      </div>
    </div>`;

  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const tab = btn.getAttribute("data-tab");
      if (tab === "logout") {
        const { logout } = await import("./api.js");
        logout();
        return;
      }
      if (tab === "admin") {
        window.location.href = "admin.html";
        return;
      }
      activeTab = tab;
      document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("active", b.getAttribute("data-tab") === tab));
      renderTab(tab);
    });
  });

  renderTab(activeTab);
}

async function renderTab(tab) {
  const panel = document.getElementById("profile-panel");
  if (!panel) return;

  if (tab === "overview") {
    panel.innerHTML = `
      <h2>Welcome, ${user.full_name}</h2>
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card"><div class="stat-label">Role</div><div class="stat-value" style="text-transform:capitalize">${user.role}</div></div>
        <div class="stat-card"><div class="stat-label">Email</div><div class="stat-value" style="font-size:1.1rem">${user.email}</div></div>
        <div class="stat-card"><div class="stat-label">Phone</div><div class="stat-value" style="font-size:1.1rem">${user.phone || "—"}</div></div>
      </div>
      <p style="color:var(--text-muted)">Manage your orders, wishlist, addresses and account settings from the menu.</p>`;
    return;
  }

  if (tab === "orders") {
    panel.innerHTML = `<h2>My Orders</h2><div class="loader"></div>`;
    try {
      const data = await api.get("/api/orders", { auth: true });
      const orders = data.orders || [];
      if (orders.length === 0) {
        panel.innerHTML = `<h2>My Orders</h2><div class="empty-state"><p>No orders yet.</p><a class="btn btn-primary" href="shop.html">Start Shopping</a></div>`;
        return;
      }
      panel.innerHTML = `
        <h2>My Orders</h2>
        <div class="orders-list">
          ${orders.map((o) => `
            <div class="order-card">
              <div class="order-card-head">
                <div>
                  <div class="order-id">#${o.order_id}</div>
                  <div style="color:var(--text-muted);font-size:0.82rem">${new Date(o.created_at).toLocaleDateString()}</div>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                  <span class="status-badge ${o.order_status.toLowerCase().replace(/ /g, "-")}">${o.order_status}</span>
                  <span class="status-badge order-placed">${o.payment_status}</span>
                </div>
              </div>
              <div class="order-items">
                ${o.items.map((i) => `
                  <div class="order-item">
                    <img src="${i.image}" alt="${i.name}"/>
                    <div>
                      <div class="oi-name">${i.name}</div>
                      <div class="oi-meta">Qty: ${i.quantity} ${i.size ? `· ${i.size}` : ""}</div>
                    </div>
                    <div style="margin-left:auto;font-weight:700">${formatPrice(i.total)}</div>
                  </div>`).join("")}
              </div>
              <div class="flex-between" style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
                <strong>Total: ${formatPrice(o.total)}</strong>
                <a class="btn btn-outline btn-sm" href="order-tracking.html?order_id=${o.order_id}">Track Order</a>
              </div>
            </div>`).join("")}
        </div>`;
    } catch (e) {
      panel.innerHTML = `<h2>My Orders</h2><div class="empty-state"><p>${e.message}</p></div>`;
    }
    return;
  }

  if (tab === "wishlist") {
    panel.innerHTML = `<h2>My Wishlist</h2><div class="loader"></div>`;
    try {
      const data = await api.get("/api/wishlist", { auth: true });
      const items = data.items || [];
      if (items.length === 0) {
        panel.innerHTML = `<h2>My Wishlist</h2><div class="empty-state"><p>Your wishlist is empty.</p><a class="btn btn-primary" href="shop.html">Browse Products</a></div>`;
        return;
      }
      panel.innerHTML = `
        <h2>My Wishlist</h2>
        <div class="wishlist-grid">
          ${items.map((i) => `
            <article class="product-card">
              <div class="product-media">
                <a href="product.html?slug=${i.product_id}"><img src="${i.image}" alt="${i.name}"/></a>
                <button class="wishlist-btn active" data-wish-remove="${i.product_id}">♥</button>
              </div>
              <div class="product-info">
                <h3 class="product-name"><a href="product.html?slug=${i.product_id}">${i.name}</a></h3>
                <div class="product-price"><span class="price">${formatPrice(i.discount_price || i.price)}</span></div>
              </div>
            </article>`).join("")}
        </div>`;
      panel.querySelectorAll("[data-wish-remove]").forEach((b) => {
        b.addEventListener("click", async () => {
          const pid = parseInt(b.getAttribute("data-wish-remove"));
          try {
            const { items: list } = await api.get("/api/wishlist", { auth: true });
            const existing = list.find((x) => x.product_id === pid);
            if (existing) await api.del(`/api/wishlist/items/${existing.id}`, { auth: true });
            if (window.HS) window.HS.refreshCounts();
            renderTab("wishlist");
          } catch (e) {}
        });
      });
    } catch (e) {
      panel.innerHTML = `<h2>My Wishlist</h2><div class="empty-state"><p>${e.message}</p></div>`;
    }
    return;
  }

  if (tab === "addresses") {
    panel.innerHTML = `<h2>Saved Addresses</h2><div class="loader"></div>`;
    try {
const data = await api.get("/api/addresses", { auth: true });
      const addrs = data.addresses || [];
      if (addrs.length === 0) {
        panel.innerHTML = `<h2>Saved Addresses</h2><div class="empty-state"><p>No saved addresses.</p></div>`;
        return;
      }
      panel.innerHTML = `
        <h2>Saved Addresses</h2>
        <div class="review-grid">
          ${addrs.map((a) => `
            <div class="review-card">
              <div class="review-head"><div class="avatar-init">${a.full_name.charAt(0)}</div>
                <div><h4>${a.full_name}</h4><span class="role">${a.phone}</span></div>
              </div>
              <p>${a.line1}${a.line2 ? ", " + a.line2 : ""}<br/>${a.city}, ${a.state} ${a.postal_code}<br/>${a.country}</p>
              ${a.is_default ? `<span class="status-badge confirmed">Default</span>` : ""}
            </div>`).join("")}
        </div>`;
    } catch (e) {
      panel.innerHTML = `<h2>Saved Addresses</h2><div class="empty-state"><p>${e.message}</p></div>`;
    }
    return;
  }

  if (tab === "edit") {
    panel.innerHTML = `
      <h2>Edit Profile</h2>
      <form id="edit-profile-form">
        <div class="form-group"><label>Full Name</label><input class="form-control" id="edit-name" value="${user.full_name}"/></div>
        <div class="form-group"><label>Phone</label><input class="form-control" id="edit-phone" value="${user.phone || ""}"/></div>
        <button type="submit" class="btn btn-primary">Save Changes</button>
      </form>`;
    document.getElementById("edit-profile-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const full_name = document.getElementById("edit-name").value.trim();
      const phone = document.getElementById("edit-phone").value.trim();
      try {
        const data = await api.put("/api/profile", { full_name, phone }, { auth: true });
        user = data.user;
        if (window.HS) window.HS.showToast("Profile updated!", "success");
        renderProfile();
      } catch (err) {
        if (window.HS) window.HS.showToast(err.message, "error");
      }
    });
    return;
  }

  if (tab === "password") {
    panel.innerHTML = `
      <h2>Change Password</h2>
      <form id="change-password-form" style="max-width:420px">
        <div class="form-group"><label>Current Password</label><input type="password" class="form-control" id="pw-current" required/></div>
        <div class="form-group"><label>New Password</label><input type="password" class="form-control" id="pw-new" required/></div>
        <div class="form-group"><label>Confirm New Password</label><input type="password" class="form-control" id="pw-confirm" required/></div>
        <button type="submit" class="btn btn-primary">Update Password</button>
      </form>`;
    document.getElementById("change-password-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const current = document.getElementById("pw-current").value;
      const newPw = document.getElementById("pw-new").value;
      const confirm = document.getElementById("pw-confirm").value;
      if (newPw !== confirm) {
        if (window.HS) window.HS.showToast("Passwords do not match.", "error");
        return;
      }
      try {
        await api.put("/api/profile/password", { current_password: current, new_password: newPw }, { auth: true });
        if (window.HS) window.HS.showToast("Password updated!", "success");
      } catch (err) {
        if (window.HS) window.HS.showToast(err.message, "error");
      }
    });
    return;
  }
}

function initProfile() {
  loadProfile();
}

document.addEventListener("DOMContentLoaded", initProfile);
