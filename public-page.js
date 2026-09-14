import { addCustomEventClickTracking, trackCustomEvent } from "./tracking.js";

const header = document.querySelector("[data-header]");
const toggle = document.querySelector(".nav-toggle");
if (header && toggle) {
  toggle.addEventListener("click", () => {
    const open = header.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  header.querySelectorAll(".site-nav a").forEach((link) => link.addEventListener("click", () => {
    header.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }));
}

document.querySelectorAll("[data-event-booking]").forEach((link) => {
  addCustomEventClickTracking(link, "EventBookingClick", {
    event_id: link.dataset.eventId,
    event_name: link.dataset.eventName,
    event_type: link.dataset.eventType,
    venue_name: link.dataset.venueName,
    suburb: link.dataset.suburb,
  });
});

document.querySelectorAll("[data-private-enquiry]").forEach((link) => addCustomEventClickTracking(link, "PrivateGroupEnquiryClick"));

const serviceCards = [...document.querySelectorAll("[data-service-card]")];
if (serviceCards.length) {
  serviceCards.forEach((card, index) => {
    card.style.setProperty("--reveal-delay", `${index * 65}ms`);
  });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reducedMotion && "IntersectionObserver" in window) {
    const cardObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        cardObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    serviceCards.forEach((card) => cardObserver.observe(card));
  }
}

const detail = document.querySelector("[data-event-detail]");
if (detail) trackCustomEvent("EventDetailView", {
  event_id: detail.dataset.eventId,
  event_name: detail.dataset.eventName,
  event_type: detail.dataset.eventType,
  venue_name: detail.dataset.venueName,
  suburb: detail.dataset.suburb,
});
