/* ============================================================
   Honeystreet — Admin Dashboard Script
   Stats, charts, products CRUD, orders, users, coupons.
   ============================================================ */

import { api, isAdmin, isLoggedIn, formatPrice } from "./api.js";

let activePanel = "dashboard";
let charts = {};

async function initAdmin() {
  const container = document.getElementById("admin-content");
  if (!container) return;

  if (!isLoggedIn()) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔐</div>
        <h3>Admin Access Required</h3>
        <p>Please login as an administrator.</p>
        <a class="btn btn-primary" href="login.html?redirect=admin">Login</a>
      </div>`;
    return;
  }

  if (!isAdmin()) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⛔</div>
        <h3>Access Denied</h3>
        <p>You do not have admin privileges.</p>
        <a class="btn btn-outline" href="profile.html">Back to Profile</a>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <h3>Admin Panel</h3>
        <div class="admin-nav">
          <button data-panel="dashboard" class="active">📊 Dashboard</button>
          <button data-panel="products">👕 Products</button>
          <button data-panel="orders">📦 Orders</button>
          <button data-panel="users">👥 Users</button>
          <button data-panel="categories">🏷 Categories</button>
          <button data-panel="coupons">🎟 Coupons</button>
        </div>
      </aside>
      <div class="admin-main" id="admin-main">
        <div class="loader"></div>
      </div>
    </div>`;

  document.querySelectorAll("[data-panel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activePanel = btn.getAttribute("data-panel");
      document.querySelectorAll("[data-panel]").forEach((b) => b.classList.toggle("active", b === btn));
      loadPanel(activePanel);
    });
  });

  loadPanel("dashboard");
}

// ---------------- Dashboard ----------------
async function loadDashboard() {
  const main = document.getElementById("admin-main");
  main.innerHTML = `<div class="loader"></div>`;
  try {
const data = await api.get("/api/admin/dashboard", { auth: true });
    const s = data.stats;
    main.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon" style="background:#e3f2fd">💰</div><div class="stat-label">Revenue</div><div class="stat-value">${formatPrice(s.total_revenue)}</div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#e8f5e9">📦</div><div class="stat-label">Orders</div><div class="stat-value">${s.total_orders}</div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#fff3e0">👥</div><div class="stat-label">Users</div><div class="stat-value">${s.total_users}</div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#f3e5f5">👕</div><div class="stat-label">Products</div><div class="stat-value">${s.total_products}</div></div>
      </div>
      <div class="chart-grid">
        <div class="chart-box"><h4>Sales (Last 6 months)</h4><canvas id="chart-sales"></canvas></div>
        <div class="chart-box"><h4>Revenue (Last 6 months)</h4><canvas id="chart-revenue"></canvas></div>
        <div class="chart-box"><h4>Orders (Last 6 months)</h4><canvas id="chart-orders"></canvas></div>
        <div class="chart-box"><h4>Customers (Last 6 months)</h4><canvas id="chart-customers"></canvas></div>
      </div>`;
    renderCharts(data);
  } catch (e) {
    main.innerHTML = `<div class="empty-state"><h3>Could not load dashboard</h3><p>${e.message}</p></div>`;
  }
}

function renderCharts(data) {
  const chartData = data.sales_by_day || [];
  const labels = chartData.map((d) => d.date.slice(5)); // MM-DD
  const revenueArr = chartData.map((d) => d.revenue || 0);
  const orderCounts = data.order_status_counts || [];
  const salesArr = revenueArr.map((r) => Math.round(r));
  const statusLabels = orderCounts.map((o) => o.status);
  const statusCounts = orderCounts.map((o) => o.count);

  const common = (ctxId, label, dataArr, color, labelsArr) => {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (charts[ctxId]) charts[ctxId].destroy();
    charts[ctxId] = new Chart(ctx, {
      type: "line",
      data: {
        labels: labelsArr || labels,
        datasets: [{ label, data: dataArr, borderColor: color, backgroundColor: color + "22", fill: true, tension: 0.4, pointRadius: 4 }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
    });
  };
  common("chart-sales", "Sales", salesArr, "#c9a15c");
  common("chart-revenue", "Revenue", revenueArr, "#30a46c");
  common("chart-orders", "Orders", statusCounts, "#0091ff", statusLabels);
  common("chart-customers", "Customers", statusCounts, "#7a5cff", statusLabels);
}

// ---------------- Products ----------------
async function loadProducts() {
  const main = document.getElementById("admin-main");
  main.innerHTML = `<div class="loader"></div>`;
  try {
    const data = await api.get("/api/products", { params: { limit: 100 } });
    const products = data.products || [];
    main.innerHTML = `
      <div class="admin-panel">
        <div class="flex-between" style="margin-bottom:16px">
          <h3 style="margin:0">Products (${products.length})</h3>
          <button class="btn btn-gold btn-sm" data-add-product>+ Add Product</button>
        </div>
        <div style="overflow-x:auto">
          <table class="admin-table">
            <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Rating</th><th>Actions</th></tr></thead>
            <tbody>
              ${products.map((p) => `
                <tr>
                  <td><img class="tiny" src="${p.image}" alt="${p.name}"/></td>
                  <td><strong>${p.name}</strong></td>
                  <td>${p.category || "—"}</td>
                  <td>${formatPrice(p.discount_price || p.price)}</td>
                  <td>${p.stock}</td>
                  <td>${p.rating} ★</td>
                  <td>
                    <button class="btn btn-sm btn-outline" data-edit-product="${p.id}" style="padding:6px 10px">Edit</button>
                    <button class="btn btn-sm btn-outline" data-del-product="${p.id}" style="padding:6px 10px;color:var(--danger)">Delete</button>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>`;

    main.querySelector("[data-add-product]").addEventListener("click", () => openProductModal());
    main.querySelectorAll("[data-edit-product]").forEach((b) => {
      b.addEventListener("click", async () => {
        const id = b.getAttribute("data-edit-product");
        const p = products.find((x) => x.id === parseInt(id));
        if (p) openProductModal(p);
      });
    });
    main.querySelectorAll("[data-del-product]").forEach((b) => {
      b.addEventListener("click", async () => {
        const id = b.getAttribute("data-del-product");
        if (!confirm("Delete this product?")) return;
        try {
          await api.del(`/api/admin/products/${id}`, { auth: true });
          if (window.HS) window.HS.showToast("Product deleted.", "success");
          loadProducts();
        } catch (e) {
          if (window.HS) window.HS.showToast(e.message, "error");
        }
      });
    });
  } catch (e) {
    main.innerHTML = `<div class="empty-state"><h3>Could not load products</h3><p>${e.message}</p></div>`;
  }
}

function openProductModal(product = null) {
  const main = document.getElementById("admin-main");
  const isEdit = !!product;
  main.innerHTML = `
    <div class="admin-panel">
      <h3>${isEdit ? "Edit Product" : "Add Product"}</h3>
      <form id="product-form">
        <div class="form-row">
          <div class="form-group"><label>Name</label><input class="form-control" id="p-name" value="${product?.name || ""}" required/></div>
          <div class="form-group"><label>Brand</label><input class="form-control" id="p-brand" value="${product?.brand || ""}" required/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Price (₹)</label><input type="number" class="form-control" id="p-price" value="${product?.price || ""}" required/></div>
          <div class="form-group"><label>Discount Price (₹)</label><input type="number" class="form-control" id="p-discount" value="${product?.discount_price || ""}"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Stock</label><input type="number" class="form-control" id="p-stock" value="${product?.stock || 0}"/></div>
          <div class="form-group"><label>Category</label>
            <select class="form-control" id="p-category">
              <option value="">Select category</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Sizes (comma)</label><input class="form-control" id="p-sizes" value="${product?.sizes?.join(",") || "S,M,L,XL"}"/></div>
          <div class="form-group"><label>Colors (comma)</label><input class="form-control" id="p-colors" value="${product?.colors?.join(",") || "Black,White"}"/></div>
        </div>
        <div class="form-group"><label>Image URL</label><input class="form-control" id="p-image" value="${product?.image || ""}"/></div>
        <div class="form-group"><label>Description</label><textarea class="form-control" id="p-desc">${product?.description || ""}</textarea></div>
        <div class="form-row">
          <label class="checkbox-row"><input type="checkbox" id="p-trending" ${product?.is_trending ? "checked" : ""}/> Trending</label>
          <label class="checkbox-row"><input type="checkbox" id="p-new" ${product?.is_new ? "checked" : ""}/> New</label>
          <label class="checkbox-row"><input type="checkbox" id="p-featured" ${product?.is_featured ? "checked" : ""}/> Featured</label>
        </div>
        <div class="flex gap-3" style="margin-top:16px">
          <button type="submit" class="btn btn-primary">${isEdit ? "Update Product" : "Create Product"}</button>
          <button type="button" class="btn btn-outline" data-cancel-product>Cancel</button>
        </div>
      </form>
    </div>`;

  // Load categories
  api.get("/api/categories").then(({ categories }) => {
    const sel = document.getElementById("p-category");
    categories.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      if (product && product.category_id === c.id) opt.selected = true;
      sel.appendChild(opt);
    });
  });

  main.querySelector("[data-cancel-product]").addEventListener("click", loadProducts);

  document.getElementById("product-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById("p-name").value.trim(),
      brand: document.getElementById("p-brand").value.trim(),
      price: parseFloat(document.getElementById("p-price").value),
      discount_price: document.getElementById("p-discount").value ? parseFloat(document.getElementById("p-discount").value) : null,
      stock: parseInt(document.getElementById("p-stock").value) || 0,
      category_id: document.getElementById("p-category").value ? parseInt(document.getElementById("p-category").value) : null,
      sizes: document.getElementById("p-sizes").value.split(",").map((s) => s.trim()).filter(Boolean),
      colors: document.getElementById("p-colors").value.split(",").map((s) => s.trim()).filter(Boolean),
      image: document.getElementById("p-image").value.trim(),
      description: document.getElementById("p-desc").value.trim(),
      is_trending: document.getElementById("p-trending").checked,
      is_new: document.getElementById("p-new").checked,
      is_featured: document.getElementById("p-featured").checked,
    };
    try {
      if (isEdit) {
        await api.put(`/api/admin/products/${product.id}`, payload, { auth: true });
        if (window.HS) window.HS.showToast("Product updated!", "success");
      } else {
        await api.post("/api/admin/products", payload, { auth: true });
        if (window.HS) window.HS.showToast("Product created!", "success");
      }
      loadProducts();
    } catch (err) {
      if (window.HS) window.HS.showToast(err.message, "error");
    }
  });
}

// ---------------- Orders ----------------
async function loadOrders() {
  const main = document.getElementById("admin-main");
  main.innerHTML = `<div class="loader"></div>`;
  try {
    const data = await api.get("/api/admin/orders", { auth: true });
    const orders = data.orders || [];
    main.innerHTML = `
      <div class="admin-panel">
        <h3>Manage Orders (${orders.length})</h3>
        <div style="overflow-x:auto">
          <table class="admin-table">
            <thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Update</th></tr></thead>
            <tbody>
              ${orders.map((o) => `
                <tr>
<td>#${o.order_id}</td>
                  <td>User #${o.user_id || "—"}</td>
                  <td>${formatPrice(o.total)}</td>
                  <td>${o.payment_method} (${o.payment_status})</td>
                  <td><span class="status-badge ${o.order_status.toLowerCase().replace(/ /g, "-")}">${o.order_status}</span></td>
<td>
                    <select class="form-control" data-order-status="${o.order_id}" style="width:auto;padding:6px">
                      ${ORDER_STATUSES.map((s) => `<option value="${s}" ${s === o.order_status ? "selected" : ""}>${s}</option>`).join("")}
                    </select>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>`;

    main.querySelectorAll("[data-order-status]").forEach((sel) => {
      sel.addEventListener("change", async () => {
        const id = sel.getAttribute("data-order-status");
        try {
await api.put(`/api/admin/orders/${id}/status`, { order_status: sel.value }, { auth: true });
          if (window.HS) window.HS.showToast("Order status updated!", "success");
        } catch (e) {
          if (window.HS) window.HS.showToast(e.message, "error");
        }
      });
    });
  } catch (e) {
    main.innerHTML = `<div class="empty-state"><h3>Could not load orders</h3><p>${e.message}</p></div>`;
  }
}

// ---------------- Users ----------------
async function loadUsers() {
  const main = document.getElementById("admin-main");
  main.innerHTML = `<div class="loader"></div>`;
  try {
    const data = await api.get("/api/admin/users", { auth: true });
    const users = data.users || [];
    main.innerHTML = `
      <div class="admin-panel">
        <h3>Manage Users (${users.length})</h3>
        <div style="overflow-x:auto">
          <table class="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th></tr></thead>
            <tbody>
              ${users.map((u) => `
                <tr>
                  <td><strong>${u.full_name}</strong></td>
                  <td>${u.email}</td>
                  <td>${u.phone || "—"}</td>
                  <td><span class="status-badge ${u.role === "admin" ? "confirmed" : "order-placed"}">${u.role}</span></td>
                  <td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch (e) {
    main.innerHTML = `<div class="empty-state"><h3>Could not load users</h3><p>${e.message}</p></div>`;
  }
}

// ---------------- Categories ----------------
async function loadCategories() {
  const main = document.getElementById("admin-main");
  main.innerHTML = `<div class="loader"></div>`;
  try {
    const data = await api.get("/api/categories");
    const cats = data.categories || [];
    main.innerHTML = `
      <div class="admin-panel">
        <h3>Categories (${cats.length})</h3>
        <div class="review-grid">
          ${cats.map((c) => `
            <div class="review-card">
              <div class="review-head"><div class="avatar-init">${c.name.charAt(0)}</div>
                <div><h4>${c.name}</h4><span class="role">${c.slug}</span></div>
              </div>
              <p>${c.description || ""}</p>
              <a href="shop.html?category=${c.slug}" class="btn btn-outline btn-sm" style="margin-top:12px">View Products</a>
            </div>`).join("")}
        </div>
      </div>`;
  } catch (e) {
    main.innerHTML = `<div class="empty-state"><h3>Could not load categories</h3><p>${e.message}</p></div>`;
  }
}

// ---------------- Coupons ----------------
async function loadCoupons() {
  const main = document.getElementById("admin-main");
  main.innerHTML = `<div class="loader"></div>`;
  try {
    const data = await api.get("/api/admin/coupons", { auth: true });
    const coupons = data.coupons || [];
    main.innerHTML = `
      <div class="admin-panel">
        <h3>Manage Coupons (${coupons.length})</h3>
        <div style="overflow-x:auto">
          <table class="admin-table">
            <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min Order</th><th>Active</th></tr></thead>
            <tbody>
              ${coupons.map((c) => `
                <tr>
                  <td><strong>${c.code}</strong></td>
                  <td>${c.discount_type}</td>
                  <td>${c.discount_type === "percent" ? c.discount_value + "%" : "₹" + c.discount_value}</td>
                  <td>₹${c.min_order_amount}</td>
                  <td><span class="status-badge ${c.is_active ? "confirmed" : "cancelled"}">${c.is_active ? "Active" : "Inactive"}</span></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch (e) {
    main.innerHTML = `<div class="empty-state"><h3>Could not load coupons</h3><p>${e.message}</p></div>`;
  }
}

// ---------------- Panel router ----------------
function loadPanel(panel) {
  switch (panel) {
    case "dashboard": loadDashboard(); break;
    case "products": loadProducts(); break;
    case "orders": loadOrders(); break;
    case "users": loadUsers(); break;
    case "categories": loadCategories(); break;
    case "coupons": loadCoupons(); break;
  }
}

const ORDER_STATUSES = [
  "Order Placed", "Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled",
];

document.addEventListener("DOMContentLoaded", initAdmin);
