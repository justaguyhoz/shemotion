const header = document.querySelector("[data-header]");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const revealItems = document.querySelectorAll(
  ".intro .narrow, .experience .section-heading, .stage, .feedback .section-heading, .quotes blockquote, .studios .split, .coach-grid, .contact-shell"
);

if (header && navToggle) {
  navToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      header.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

if (revealItems.length) {
  revealItems.forEach((item, index) => {
    item.classList.add("reveal");

    if (item.matches(".section-heading, .narrow, .contact-shell")) {
      item.classList.add("reveal-soft");
    }

    if (item.matches("blockquote")) {
      item.style.setProperty("--reveal-delay", `${(index % 5) * 90}ms`);
    }
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }
}
