// ========================================
// Southwest Site Builders — Portfolio Shared Script
// Professional interactivity for concept sites
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  // --- Navbar scroll effect ---
  const navbar = document.querySelector(".navbar");
  if (navbar) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 60) navbar.classList.add("scrolled");
      else navbar.classList.remove("scrolled");
    });
  }

  // --- Mobile menu toggle ---
  const toggle = document.querySelector(".mobile-toggle");
  if (toggle) {
    const navLinks = document.querySelector(".nav-links");
    const navCta = document.querySelector(".nav-cta");
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", !expanded);
      if (navLinks) {
        navLinks.style.display = !expanded ? "flex" : "none";
        navLinks.style.flexDirection = "column";
        navLinks.style.position = "absolute";
        navLinks.style.top = "72px";
        navLinks.style.left = "0";
        navLinks.style.right = "0";
        navLinks.style.background = "#fff";
        navLinks.style.padding = "24px";
        navLinks.style.gap = "16px";
        navLinks.style.borderTop = "1px solid var(--border)";
        navLinks.style.boxShadow = "0 10px 30px -10px rgba(15,23,42,0.12)";
      }
      if (navCta) navCta.style.display = !expanded ? "flex" : "none";
    });
  }

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // --- Fade-in on scroll ---
  const observerOptions = { threshold: 0.12, rootMargin: "0px 0px -80px 0px" };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  }, observerOptions);

  document.querySelectorAll(".fade-in, .card, .service-card, .testimonial-card, .feature-item").forEach((el) => {
    el.classList.add("fade-in");
    observer.observe(el);
  });

  // --- Contact form handling ---
  const forms = document.querySelectorAll("form");
  forms.forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type='submit']");
      const originalText = btn.textContent;
      btn.textContent = "Sending...";
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = "Message Sent!";
        btn.style.background = "#059669";
        setTimeout(() => {
          btn.textContent = originalText;
          btn.disabled = false;
          btn.style.background = "";
          form.reset();
        }, 2000);
      }, 1200);
    });
  });

  // --- Active nav link highlighting ---
  const links = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll("section[id]");
  function highlightNav() {
    const scrollPos = window.scrollY + 100;
    sections.forEach((sec) => {
      const top = sec.offsetTop;
      const bottom = top + sec.offsetHeight;
      const id = sec.getAttribute("id");
      if (scrollPos >= top && scrollPos < bottom) {
        links.forEach((l) => l.classList.remove("active"));
        const active = document.querySelector(`.nav-link[href="#${id}"]`);
        if (active) active.classList.add("active");
      }
    });
  }
  window.addEventListener("scroll", highlightNav);
  window.addEventListener("load", highlightNav);
});
