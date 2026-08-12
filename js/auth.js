/* ============================================================
   Honeystreet — Authentication Script
   Handles login and registration forms.
   ============================================================ */

import { api, setToken, isLoggedIn } from "./api.js";

// ---------------- Login ----------------
function initLogin() {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const remember = document.getElementById("remember-me").checked;

    if (!email || !password) {
      if (window.HS) window.HS.showToast("Please enter email and password.", "warning");
      return;
    }

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Logging in...";

    try {
      const data = await api.post("/api/auth/login", { email, password });
      setToken(data.access_token, remember);

// Store user for UI and update counts
      if (data.user) {
        const { getUser, setUser } = await import("./api.js");
        setUser(data.user);
      }
      if (window.HS) {
        window.HS.refreshCounts();
        window.HS.showToast(`Welcome back, ${data.user ? data.user.full_name : ""}!`, "success");
      }

      const redirect = new URLSearchParams(window.location.search).get("redirect");
      setTimeout(() => {
        if (data.user.role === "admin") window.location.href = "admin.html";
        else window.location.href = redirect || "profile.html";
      }, 600);
    } catch (err) {
      window.HS.showToast(err.message || "Login failed.", "error");
      btn.disabled = false;
      btn.textContent = "Login";
    }
  });
}

// ---------------- Register ----------------
function initRegister() {
  const form = document.getElementById("register-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const full_name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const phone = document.getElementById("reg-phone").value.trim();
    const password = document.getElementById("reg-password").value;
    const confirm = document.getElementById("reg-confirm").value;

    if (password !== confirm) {
      if (window.HS) window.HS.showToast("Passwords do not match.", "error");
      return;
    }
    if (password.length < 8) {
      if (window.HS) window.HS.showToast("Password must be at least 8 characters.", "error");
      return;
    }

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Creating account...";

    try {
      await api.post("/api/auth/register", { full_name, email, phone, password });
      if (window.HS) window.HS.showToast("Account created! Please login.", "success");
      setTimeout(() => (window.location.href = "login.html"), 800);
    } catch (err) {
      if (window.HS) window.HS.showToast(err.message || "Registration failed.", "error");
      btn.disabled = false;
      btn.textContent = "Create Account";
    }
  });
}

// ---------------- Init ----------------
function initAuth() {
  initLogin();
  initRegister();
}

document.addEventListener("DOMContentLoaded", initAuth);
