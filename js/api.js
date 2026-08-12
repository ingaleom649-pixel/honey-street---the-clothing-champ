/* ============================================================
   Honeystreet — API Helper
   Centralized fetch wrapper for talking to the Flask backend.
   ============================================================ */

const API_BASE = (window.API_BASE_URL || "http://127.0.0.1:5000");

// Token management
const TOKEN_KEY = "honeystreet_token";
const USER_KEY = "honeystreet_user";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || null;
  } catch (e) {
    return null;
  }
}

function setUser(user) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

function isLoggedIn() {
  return !!getToken();
}

function isAdmin() {
  const u = getUser();
  return u && u.role === "admin";
}

function logout() {
  setToken(null);
  setUser(null);
  window.location.href = "index.html";
}

// Core request helper
async function apiRequest(path, options = {}) {
  const { method = "GET", body, auth = false, params } = options;

  let url = API_BASE + path;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, v);
    });
    const str = qs.toString();
    if (str) url += (url.includes("?") ? "&" : "?") + str;
  }

  const headers = { "Content-Type": "application/json" };
  if (auth && getToken()) {
    headers["Authorization"] = "Bearer " + getToken();
  }

  const config = { method, headers };
  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(url, config);

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = { message: "Unexpected response from server." };
  }

  if (!res.ok) {
    if (res.status === 401 && path.indexOf("/admin/") === -1) {
      // Token may have expired silently; only redirect if not an admin page
      if (path.indexOf("/api/auth/") === -1) {
        setToken(null);
        setUser(null);
      }
    }
    const err = new Error(data.message || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// Convenience methods
const api = {
  get: (path, options) => apiRequest(path, { ...options, method: "GET" }),
  post: (path, body, options) => apiRequest(path, { ...options, method: "POST", body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: "PATCH", body }),
  del: (path, options) => apiRequest(path, { ...options, method: "DELETE" }),
};

// Format currency (INR)
function formatPrice(value) {
  const num = Number(value || 0);
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

// Build star HTML from rating
function starsHtml(rating, size = "") {
  const full = Math.round(rating || 0);
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    stars += i <= full ? "★" : "☆";
  }
  return `<span class="stars ${size}">${stars}</span>`;
}

// Debounce helper
function debounce(fn, delay = 300) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), delay);
  };
}

export { api, apiRequest, getToken, setToken, getUser, setUser, isLoggedIn, isAdmin, logout, formatPrice, starsHtml, debounce, API_BASE };
