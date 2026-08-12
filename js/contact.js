/* Honeystreet - Contact form handler (frontend only demo). */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (window.HS) window.HS.showToast("Message sent! We'll get back to you soon.", "success");
    form.reset();
  });
});
