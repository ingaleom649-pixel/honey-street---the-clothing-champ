/* ============================================================
   Honeystreet — Main Script
   Shared: theme toggle, header/footer injection, search, toasts,
   cart/wishlist counts, scroll reveal, back-to-top, tilt effect.
   ============================================================ */

import { api, getToken, setToken, getUser, setUser, isLoggedIn, isAdmin, formatPrice } from "./api.js";

// ---------------- Theme ----------------
function initTheme() {
  const saved = localStorage.getItem("honeystreet_theme") || "light";
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.classList.toggle("dark-mode", theme === "dark");
  localStorage.setItem("honeystreet_theme", theme);
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.innerHTML = theme === "dark"
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  });
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains("dark-mode");
  applyTheme(isDark ? "light" : "dark");
}

// ---------------- Toasts ----------------
function showToast(message, type = "info") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icons = { success: "✓", error: "✕", warning: "!", info: "ℹ" };
  toast.innerHTML = `<span class="toast-icon">${icons[type] || "ℹ"}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}

// ---------------- Cart / Wishlist counts ----------------
async function refreshCounts() {
  if (!isLoggedIn()) {
    setCounts(0, 0);
    return;
  }
  try {
    const [cart, wish] = await Promise.all([
      api.get("/api/cart", { auth: true }),
      api.get("/api/wishlist", { auth: true }),
    ]);
    setCounts(cart.count || 0, wish.count || 0);
  } catch (e) {
    // ignore
  }
}

function setCounts(cartCount, wishCount) {
  const cartBadge = document.querySelector("[data-cart-count]");
  const wishBadge = document.querySelector("[data-wishlist-count]");
  if (cartBadge) {
    cartBadge.textContent = cartCount;
    cartBadge.style.display = cartCount > 0 ? "grid" : "none";
  }
  if (wishBadge) {
    wishBadge.textContent = wishCount;
    wishBadge.style.display = wishCount > 0 ? "grid" : "none";
  }
}

// ---------------- Header / Footer injection ----------------
function logoHtml() {
  return `
    <a href="index.html" class="logo">
      <span class="logo-icon">H</span>
      Honey<span>street</span>
    </a>`;
}

function headerHtml() {
  const user = getUser();
  const dashboardLink = isAdmin()
    ? '<a href="admin.html" class="icon-btn" title="Admin Dashboard"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/></svg></a>'
    : "";

  return `
  <header class="header" id="site-header">
    <div class="container nav">
      ${logoHtml()}
      <nav class="nav-links" id="nav-links">
        <a href="index.html" data-nav="home">Home</a>
        <a href="shop.html" data-nav="shop">Shop</a>
        <a href="shop.html?category=mens-clothing" data-nav="men">Men</a>
        <a href="shop.html?category=womens-clothing" data-nav="women">Women</a>
        <a href="shop.html?new=true" data-nav="new">New Arrivals</a>
        <a href="shop.html" data-nav="offers">Offers</a>
        <a href="about.html" data-nav="about">About</a>
        <a href="contact.html" data-nav="contact">Contact</a>
      </nav>
      <div class="nav-actions">
        <button class="icon-btn hide-on-very-small" data-search-btn title="Search" aria-label="Search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </button>
        <button class="icon-btn" data-theme-toggle title="Toggle theme" aria-label="Toggle theme"></button>
        <a href="wishlist.html" class="icon-btn" title="Wishlist">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <span class="badge" data-wishlist-count style="display:none">0</span>
        </a>
        <a href="cart.html" class="icon-btn" title="Cart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <span class="badge" data-cart-count style="display:none">0</span>
        </a>
        ${dashboardLink}
        <a href="${isLoggedIn() ? "profile.html" : "login.html"}" class="icon-btn" title="Account">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </a>
        <button class="hamburger" data-hamburger aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </header>

  <div class="mobile-menu" data-mobile-menu>
    <a href="index.html">Home</a>
    <a href="shop.html">Shop</a>
    <a href="shop.html?category=mens-clothing">Men</a>
    <a href="shop.html?category=womens-clothing">Women</a>
    <a href="shop.html?new=true">New Arrivals</a>
    <a href="shop.html">Offers</a>
    <a href="about.html">About</a>
    <a href="contact.html">Contact</a>
    ${isLoggedIn()
      ? `<a href="profile.html">My Profile</a><a href="#" data-logout>Logout</a>`
      : `<a href="login.html">Login</a><a href="register.html">Register</a>`}
  </div>

  <div class="search-overlay" data-search-overlay>
    <div class="search-box">
      <div class="search-input-wrap">
        <input type="text" placeholder="Search products, brands, categories..." data-search-input autocomplete="off"/>
        <button class="search-go-btn" data-search-go>➜</button>
      </div>
      <div class="suggestions" data-search-suggestions></div>
    </div>
  </div>`;
}

function footerHtml() {
  return `
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="brand-about">
          <a href="index.html" class="logo"><span class="logo-icon">H</span>Honey<span>street</span></a>
          <p style="font-size:0.9rem;line-height:1.7;">Style That Walks With You. Premium fashion crafted for your everyday confidence.</p>
          <div class="footer-social">
            <a href="https://www.linkedin.com/in/om-ingale-874a53427" target="_blank" rel="noopener" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.27c-.97 0-1.75-.79-1.75-1.75s.78-1.75 1.75-1.75 1.75.79 1.75 1.75-.78 1.75-1.75 1.75zm13.5 12.27h-3v-5.6c0-3.37-4-3.11-4 0v5.6h-3v-11h3v1.77c1.4-2.12 7-2.28 7 2.01v7.22z"/></svg>
            </a>
            <a href="https://www.instagram.com/" target="_blank" rel="noopener" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07zm0-2.16c-3.26 0-3.67.01-4.95.07-1.28.06-2.15.26-2.91.56-.79.31-1.46.72-2.13 1.39-.67.67-1.08 1.34-1.39 2.13-.3.76-.5 1.63-.56 2.91-.06 1.28-.07 1.69-.07 4.95s.01 3.67.07 4.95c.06 1.28.26 2.15.56 2.91.31.79.72 1.46 1.39 2.13.67.67 1.34 1.08 2.13 1.39.76.3 1.63.5 2.91.56 1.28.06 1.69.07 4.95.07s3.67-.01 4.95-.07c1.28-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.39.67-.67 1.08-1.34 1.39-2.13.3-.76.5-1.63.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.28-.26-2.15-.56-2.91-.31-.79-.72-1.46-1.39-2.13-.67-.67-1.34-1.08-2.13-1.39-.76-.3-1.63-.5-2.91-.56-1.28-.06-1.69-.07-4.95-.07zm0 5.84a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 11.54a4.54 4.54 0 1 1 0-9.08 4.54 4.54 0 0 1 0 9.08zm8.9-11.84a1.64 1.64 0 1 1-3.28 0 1.64 1.64 0 0 1 3.28 0z"/></svg>
            </a>
            <a href="https://github.com/" target="_blank" rel="noopener" aria-label="GitHub">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.33.95.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.67.41.36.77 1.06.77 2.14v3.18c0 .3.2.67.8.55A10.51 10.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>
            </a>
          </div>
        </div>
        <div>
          <h4>Honeystreet</h4>
          <a href="about.html">About Us</a>
          <a href="about.html">Our Story</a>
          <a href="contact.html">Careers</a>
          <a href="contact.html">Contact</a>
        </div>
        <div>
          <h4>Customer Service</h4>
          <a href="contact.html">Help Center</a>
          <a href="about.html">Shipping</a>
          <a href="contact.html">Returns</a>
          <a href="contact.html">FAQs</a>
        </div>
        <div>
          <h4>Shop</h4>
          <a href="shop.html?category=mens-clothing">Men</a>
          <a href="shop.html?category=womens-clothing">Women</a>
          <a href="shop.html?new=true">New Arrivals</a>
          <a href="shop.html">Offers</a>
        </div>
        <div>
          <h4>Legal</h4>
          <a href="about.html">Privacy Policy</a>
          <a href="about.html">Terms & Conditions</a>
          <a href="about.html">Refund Policy</a>
        </div>
      </div>
      <div class="footer-bottom">
        © 2026 Honeystreet. All Rights Reserved.
      </div>
    </div>
  </footer>

  <button class="back-to-top" data-back-to-top aria-label="Back to top">↑</button>`;
}

// ---------------- Search ----------------
function initSearch() {
  const overlay = document.querySelector("[data-search-overlay]");
  const input = document.querySelector("[data-search-input]");
  const suggestions = document.querySelector("[data-search-suggestions]");
  if (!overlay) return;

  document.querySelectorAll("[data-search-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      overlay.classList.toggle("active");
      if (overlay.classList.contains("active")) {
        setTimeout(() => input.focus(), 100);
      }
    });
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("active");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") overlay.classList.remove("active");
  });

  const doSearch = debounce(async () => {
    const q = input.value.trim();
    if (!q) {
      suggestions.innerHTML = "";
      return;
    }
    try {
      const data = await api.get("/api/search", { params: { q } });
      if (!data.suggestions || data.suggestions.length === 0) {
        suggestions.innerHTML = `<div class="empty-state" style="padding:20px"><p>No results for "${q}"</p></div>`;
        return;
      }
      suggestions.innerHTML = data.suggestions
        .map(
          (s) => `
          <a class="suggestion-item" href="product.html?slug=${s.slug}">
            <img src="${s.image}" alt="${s.name}" loading="lazy"/>
            <span class="s-name">${s.name}</span>
            <span class="s-price">${formatPrice(s.price)}</span>
          </a>`
        )
        .join("");
    } catch (e) {
      suggestions.innerHTML = `<div class="empty-state" style="padding:20px"><p>Search failed.</p></div>`;
    }
  }, 300);

  input.addEventListener("input", doSearch);

  document.querySelector("[data-search-go]").addEventListener("click", () => {
    const q = input.value.trim();
    if (!q) return;
    window.location.href = `search.html?q=${encodeURIComponent(q)}`;
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = input.value.trim();
      if (q) window.location.href = `search.html?q=${encodeURIComponent(q)}`;
    }
  });
}

// ---------------- Mobile menu ----------------
function initMobileMenu() {
  const hamburger = document.querySelector("[data-hamburger]");
  const menu = document.querySelector("[data-mobile-menu]");
  if (!hamburger || !menu) return;
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("open");
    menu.classList.toggle("open");
  });
  menu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      hamburger.classList.remove("open");
      menu.classList.remove("open");
    });
  });
}

// ---------------- Header scroll ----------------
function initScrollEffects() {
  const header = document.getElementById("site-header");
  const backTop = document.querySelector("[data-back-to-top]");
  window.addEventListener("scroll", () => {
    if (header) header.classList.toggle("scrolled", window.scrollY > 10);
    if (backTop) backTop.classList.toggle("show", window.scrollY > 500);
  });
  if (backTop) {
    backTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }
}

// ---------------- Scroll reveal ----------------
function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (els.length === 0) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  els.forEach((el) => io.observe(el));
}

// ---------------- Product card tilt ----------------
function initTilt() {
  const cards = document.querySelectorAll("[data-tilt]");
  if (cards.length === 0 || window.matchMedia("(max-width: 640px)").matches) return;
  cards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${y * -8}deg) translateY(-8px)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

// ---------------- Active nav ----------------
function setActiveNav() {
  const path = window.location.pathname.split("/").pop() || "index.html";
  const map = {
    "shop.html": "shop",
    "product.html": "shop",
    "index.html": "home",
    "about.html": "about",
    "contact.html": "contact",
  };
  const active = map[path];
  if (active) {
    document.querySelectorAll(`[data-nav="${active}"]`).forEach((a) => a.classList.add("active"));
  }
}

// ---------------- Logout ----------------
function initLogout() {
  document.querySelectorAll("[data-logout]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      setToken(null);
      setUser(null);
      showToast("Logged out successfully.", "success");
      setTimeout(() => (window.location.href = "index.html"), 600);
    });
  });
}

// ---------------- Init ----------------
function initShared() {
  // Inject header/footer if placeholders exist
  const headerSlot = document.getElementById("header-slot");
  const footerSlot = document.getElementById("footer-slot");
  if (headerSlot) headerSlot.innerHTML = headerHtml();
  if (footerSlot) footerSlot.innerHTML = footerHtml();

  initTheme();
  initSearch();
  initMobileMenu();
  initScrollEffects();
  initReveal();
  initTilt();
  setActiveNav();
  initLogout();

  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", toggleTheme);
  });

  refreshCounts();
}

document.addEventListener("DOMContentLoaded", initShared);

// Expose some helpers globally for inline scripts
window.HS = { showToast, refreshCounts, setCounts, formatPrice, isLoggedIn, isAdmin, getUser };
