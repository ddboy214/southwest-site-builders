// Southwest Site Builders — navigation, FAQ, and contact-form interactions.
document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.getElementById("navbar");
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("nav-links");

  // Keep the fixed navigation legible while scrolling.
  if (navbar) {
    const updateNavbar = () => navbar.classList.toggle("scrolled", window.scrollY > 60);
    window.addEventListener("scroll", updateNavbar, { passive: true });
    updateNavbar();
  }

  // Accessible mobile navigation.
  if (hamburger && navLinks) {
    const closeMenu = () => {
      navLinks.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
    };

    hamburger.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("open");
      hamburger.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  // Highlight the in-page navigation item for the visible section.
  const sections = document.querySelectorAll("section[id]");
  const navItems = document.querySelectorAll(".nav-link[href^='#']");
  const setActiveLink = () => {
    const scrollPosition = window.scrollY + 120;
    sections.forEach((section) => {
      const top = section.offsetTop;
      const bottom = top + section.offsetHeight;
      if (scrollPosition >= top && scrollPosition < bottom) {
        navItems.forEach((item) => item.classList.toggle("active", item.hash === `#${section.id}`));
      }
    });
  };
  window.addEventListener("scroll", setActiveLink, { passive: true });
  window.addEventListener("load", setActiveLink);
  setActiveLink();

  // FAQ accordion: keep one answer open at a time and expose its state to assistive tech.
  document.querySelectorAll(".faq-question").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => {
      const item = button.closest(".faq-item");
      const shouldOpen = !item.classList.contains("open");
      document.querySelectorAll(".faq-item").forEach((faqItem) => {
        faqItem.classList.remove("open");
        faqItem.querySelector(".faq-question")?.setAttribute("aria-expanded", "false");
      });
      if (shouldOpen) {
        item.classList.add("open");
        button.setAttribute("aria-expanded", "true");
      }
    });
  });

  // A static GitHub Pages site has no form backend. Prepare an email draft instead
  // of showing a misleading "sent" message or silently discarding a quote request.
  const form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const values = new FormData(form);
      const fields = [...values.entries()];
      const recipient = form.dataset.recipient;
      const name = values.get("name");
      const business = values.get("business");
      const subject = `Website quote request${business ? ` — ${business}` : name ? ` — ${name}` : ""}`;
      const body = fields.map(([label, value]) => `${label}: ${value}`).join("\n");
      const status = document.getElementById("form-status");

      if (status) {
        status.textContent = `Your email app should open with this draft. If it doesn't, email ${recipient} directly.`;
      }
      window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }

  // Reveal content as it enters the viewport, with a graceful fallback.
  const revealTargets = document.querySelectorAll(
    ".service-card, .portfolio-item, .process-step, .about-text, .about-image, .testimonial-card, .faq-item"
  );
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

    revealTargets.forEach((element) => {
      element.classList.add("reveal-target");
      observer.observe(element);
    });
  } else {
    revealTargets.forEach((element) => element.classList.add("revealed"));
  }
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
  @media (prefers-reduced-motion: reduce) {
    .reveal-target, .reveal-target.revealed { transition: none; transform: none; }
  }
`;
document.head.appendChild(revealStyles);
