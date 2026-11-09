// ========================================
// Southwest Site Builders — Interactive Script
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  // --- Navbar scroll effect ---
  const navbar = document.getElementById("navbar");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 60) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });

  // --- Mobile hamburger menu ---
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("nav-links");

  hamburger.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    hamburger.setAttribute("aria-expanded", isOpen);
  });

  // Close menu when clicking a link
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
    });
  });

  // --- Active nav link on scroll ---
  const sections = document.querySelectorAll("section[id]");
  const navItems = document.querySelectorAll(".nav-link");

  function setActiveLink() {
    const scrollPos = window.scrollY + 120;

    sections.forEach((section) => {
      const top = section.offsetTop;
      const bottom = top + section.offsetHeight;
      const id = section.getAttribute("id");

      if (scrollPos >= top && scrollPos < bottom) {
        navItems.forEach((item) => item.classList.remove("active"));
        const active = document.querySelector(`.nav-link[href="#${id}"]`);
        if (active) active.classList.add("active");
      }
    });
  }

  window.addEventListener("scroll", setActiveLink);
  window.addEventListener("load", setActiveLink);

  // --- FAQ accordion ---
  document.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.parentElement;
      const isOpen = item.classList.contains("open");

      // Close all FAQ items
      document.querySelectorAll(".faq-item").forEach((i) => i.classList.remove("open"));

      // Open clicked if it was closed
      if (!isOpen) {
        item.classList.add("open");
      }
    });
  });

  // --- Contact form submission ---
  const form = document.getElementById("contact-form");
  const submitBtn = document.getElementById("submit-btn");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    submitBtn.textContent = "Sending...";
    submitBtn.disabled = true;

    setTimeout(() => {
      submitBtn.textContent = "Quote Request Sent!";
      submitBtn.style.background = "#059669";

      setTimeout(() => {
        submitBtn.textContent = "Request Free Quote";
        submitBtn.disabled = false;
        submitBtn.style.background = "";
        form.reset();
      }, 2000);
    }, 1500);
  });

  // --- Reveal-on-scroll animation ---
  const observerOptions = {
    threshold: 0.12,
    rootMargin: "0px 0px -60px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
      }
    });
  }, observerOptions);

  document.querySelectorAll(
    ".service-card, .portfolio-item, .process-step, .about-text, .about-image, .testimonial-card, .faq-item"
  ).forEach((el) => {
    el.classList.add("reveal-target");
    observer.observe(el);
  });
});

const revealStyles = document.createElement("style");
revealStyles.textContent = `
  .reveal-target {
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.7s ease, transform 0.7s ease;
  }
  .reveal-target.revealed {
    opacity: 1;
    transform: translateY(0);
  }
`;
document.head.appendChild(revealStyles);
