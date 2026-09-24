import { addCustomEventClickTracking, trackCustomEvent } from "./tracking.js";

import { setupNavigation } from "./navigation.js";

setupNavigation();

document.querySelectorAll("[data-event-booking]").forEach((link) => {
  addCustomEventClickTracking(link, "EventBookingClick", {
    event_id: link.dataset.eventId,
    event_name: link.dataset.eventName,
    event_type: link.dataset.eventType,
    venue_name: link.dataset.venueName,
    suburb: link.dataset.suburb,
  });
});

document.querySelectorAll("[data-organisation-enquiry]").forEach((link) => addCustomEventClickTracking(link, "OrganisationEnquiryClick"));

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
        entry.target.addEventListener("transitionend", () => entry.target.style.removeProperty("--reveal-delay"), { once: true });
        entry.target.classList.add("is-revealed");
        cardObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    serviceCards.forEach((card) => cardObserver.observe(card));
  } else {
    serviceCards.forEach((card) => card.classList.add("is-revealed"));
  }
}

const revealItems = [...document.querySelectorAll("[data-reveal]")];
if (revealItems.length) {
  document.querySelectorAll("[data-reveal-group]").forEach((group) => {
    [...group.children].filter((item) => item.matches("[data-reveal]")).forEach((item, index) => {
      item.style.setProperty("--reveal-delay", `${index * 65}ms`);
    });
  });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reducedMotion && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.addEventListener("transitionend", () => entry.target.style.removeProperty("--reveal-delay"), { once: true });
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
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
