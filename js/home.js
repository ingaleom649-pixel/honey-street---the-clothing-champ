/* ============================================================
   Honeystreet — Homepage Script
   Loads categories, new arrivals, trending products, reviews,
   countdown timer, newsletter.
   ============================================================ */

import { api, formatPrice, starsHtml } from "./api.js";
import { renderProductGrid, productCardHtml, skeletonGrid, initProductActions, initQuickView } from "./products.js";

// ---------------- Featured Spotlight ---------------- */
async function loadSpotlight() {
  const grid = document.getElementById("home-spotlight");
  if (!grid) return;
  grid.innerHTML = skeletonGrid(3);
  try {
    const data = await api.get("/api/products", { params: { featured: true, limit: 3 } });
    grid.innerHTML = data.products.map(productCardHtml).join("");
  } catch (e) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Could not load featured products.</p></div>`;
  }
}

// ---------------- Categories ----------------
async function loadCategories() {
  const container = document.getElementById("home-categories");
  if (!container) return;
  try {
    const { categories } = await api.get("/api/categories");
    container.innerHTML = categories
      .map(
        (c) => `
        <a class="cat-card reveal" href="shop.html?category=${c.slug}">
          <img src="${c.image}" alt="${c.name}" loading="lazy"/>
          <div class="cat-overlay">
            <h3>${c.name}</h3>
            <a href="shop.html?category=${c.slug}">Shop now →</a>
          </div>
        </a>`
      )
      .join("");
  } catch (e) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Could not load categories.</p></div>`;
  }
}

// ---------------- New Arrivals ----------------
async function loadNewArrivals() {
  const grid = document.getElementById("home-new-arrivals");
  if (!grid) return;
  grid.innerHTML = skeletonGrid(4);
  try {
    const data = await api.get("/api/products", { params: { new: true, limit: 8 } });
    renderProductGrid(grid, data.products);
  } catch (e) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Could not load new arrivals.</p></div>`;
  }
}

// ---------------- Trending ----------------
async function loadTrending() {
  const scroll = document.getElementById("home-trending");
  if (!scroll) return;
  scroll.innerHTML = skeletonGrid(4);
  try {
    const data = await api.get("/api/products", { params: { trending: true, limit: 8 } });
    if (data.products.length === 0) {
      scroll.style.display = "none";
      return;
    }
    scroll.innerHTML = data.products.map(productCardHtml).join("");
  } catch (e) {
    scroll.style.display = "none";
  }
}

// ---------------- Reviews ----------------
const REVIEW_CARDS = [
  { name: "Aarav Sharma", role: "Verified Buyer", rating: 5, text: "Absolutely love the quality. The fabric feels premium and fits perfectly. Honeystreet is my go-to now!" },
  { name: "Priya Patel", role: "Verified Buyer", rating: 4, text: "Very stylish collection. The dress I ordered looked even better in person. Delivery was quick." },
  { name: "Rohan Mehta", role: "Verified Buyer", rating: 5, text: "Great customer service and outstanding denim. You can feel the craftsmanship in every piece." },
  { name: "Sneha Iyer", role: "Fashion Blogger", rating: 5, text: "The new arrivals are on point. Love the modern premium aesthetic — definitely worth the price." },
  { name: "Kabir Khan", role: "Verified Buyer", rating: 4, text: "Best hoodie I own. Warm, comfortable and stylish. Will be ordering more soon." },
  { name: "Ananya Rao", role: "Verified Buyer", rating: 5, text: "Beautiful pieces with amazing finishing. The style guide on the site is super helpful too." },
];

function loadReviews() {
  const container = document.getElementById("home-reviews");
  if (!container) return;
  container.innerHTML = REVIEW_CARDS.map(
    (r) => `
    <div class="review-card reveal">
      <div class="review-head">
        <div class="avatar-init">${r.name.charAt(0)}</div>
        <div>
          <h4>${r.name}</h4>
          <span class="role">${r.role}</span>
        </div>
      </div>
      <div class="stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
      <p>"${r.text}"</p>
    </div>`
  ).join("");
}

// ---------------- Countdown ----------------
function initCountdown() {
  const el = document.getElementById("sale-countdown");
  if (!el) return;
  const deadlineAttr = el.getAttribute("data-deadline") || "+3d";
  let deadline;

  const saved = localStorage.getItem("honeystreet_sale_deadline");
  if (saved) {
    deadline = new Date(saved);
    if (deadline < new Date()) {
      deadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      localStorage.setItem("honeystreet_sale_deadline", deadline.toISOString());
    }
  } else {
    deadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    localStorage.setItem("honeystreet_sale_deadline", deadline.toISOString());
  }

  const days = el.querySelector("[data-days]");
  const hours = el.querySelector("[data-hours]");
  const minutes = el.querySelector("[data-minutes]");
  const seconds = el.querySelector("[data-seconds]");

  const pad = (n) => String(n).padStart(2, "0");

  function tick() {
    const diff = deadline - new Date();
    if (diff <= 0) {
      days.textContent = "00";
      hours.textContent = "00";
      minutes.textContent = "00";
      seconds.textContent = "00";
      return;
    }
    days.textContent = pad(Math.floor(diff / (1000 * 60 * 60 * 24)));
    hours.textContent = pad(Math.floor((diff / (1000 * 60 * 60)) % 24));
    minutes.textContent = pad(Math.floor((diff / (1000 * 60)) % 60));
    seconds.textContent = pad(Math.floor((diff / 1000) % 60));
  }

  tick();
  setInterval(tick, 1000);
}

// ---------------- Newsletter ----------------
function initNewsletter() {
  const form = document.getElementById("newsletter-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = form.querySelector("input");
    const email = input.value.trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      if (window.HS) window.HS.showToast("Please enter a valid email.", "error");
      return;
    }
    if (window.HS) window.HS.showToast("Welcome to the Honeystreet Family! 🎉", "success");
    form.reset();
  });
}

// ---------------- Init ----------------
function initHome() {
  loadSpotlight();
  loadCategories();
  loadNewArrivals();
  loadTrending();
  loadReviews();
  initCountdown();
  initNewsletter();
  initProductActions();
  initQuickView();
}

document.addEventListener("DOMContentLoaded", initHome);
