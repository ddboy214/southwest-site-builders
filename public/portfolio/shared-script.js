// Shared interactions for Southwest Site Builders' portfolio concept sites.
document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.querySelector(".navbar");
  if (navbar) {
    const updateNavbar = () => navbar.classList.toggle("scrolled", window.scrollY > 60);
    window.addEventListener("scroll", updateNavbar, { passive: true });
    updateNavbar();
  }

  // Mobile navigation menu.
  const toggle = document.querySelector(".mobile-toggle");
  const navLinks = document.querySelector(".nav-links");
  const navCta = document.querySelector(".nav-cta");
  if (toggle && navLinks) {
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(expanded));
      navLinks.style.display = expanded ? "flex" : "none";
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
      if (navCta) navCta.style.display = expanded ? "flex" : "none";
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.style.display = "none";
        if (navCta) navCta.style.display = "none";
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Smooth-scroll only valid in-page targets (a bare # is intentionally ignored).
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const targetId = anchor.getAttribute("href").slice(1);
      if (!targetId) return;
      const target = document.getElementById(targetId);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // Fade in content as it enters the viewport.
  const animatedElements = document.querySelectorAll(".fade-in, .card, .service-card, .testimonial-card, .feature-item");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -80px 0px" });
    animatedElements.forEach((element) => {
      element.classList.add("fade-in");
      observer.observe(element);
    });
  } else {
    animatedElements.forEach((element) => element.classList.add("visible"));
  }

  // These are static portfolio demos, not live business systems. Prepare an email
  // draft rather than pretending the request was sent to a backend.
  document.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const emailLink = document.querySelector('a[href^="mailto:"]');
      const recipient = form.dataset.recipient || emailLink?.getAttribute("href").slice(7).split(/[?;]/)[0];
      let status = form.querySelector(".form-status");
      if (!status) {
        status = document.createElement("p");
        status.className = "form-status";
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        form.append(status);
      }

      if (!recipient) {
        status.textContent = "This is a portfolio demo. Please use the contact details shown on the page.";
        return;
      }

      const fields = [...new FormData(form).entries()];
      const body = fields.map(([label, value]) => `${label}: ${value}`).join("\n");
      const subject = `Website inquiry — ${document.title.split("|")[0].trim()}`;
      status.textContent = `Your email app should open with a draft. This demo does not send or store information; if needed, contact ${recipient} directly.`;
      window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  });

  // Highlight the current in-page section where applicable.
  const links = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll("section[id]");
  const highlightNav = () => {
    const scrollPosition = window.scrollY + 100;
    sections.forEach((section) => {
      const isActive = scrollPosition >= section.offsetTop && scrollPosition < section.offsetTop + section.offsetHeight;
      if (isActive) {
        links.forEach((link) => link.classList.toggle("active", link.hash === `#${section.id}`));
      }
    });
  };
  window.addEventListener("scroll", highlightNav, { passive: true });
  window.addEventListener("load", highlightNav);
  highlightNav();
});
