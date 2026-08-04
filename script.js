const BRISBANE_TIMEZONE = "Australia/Brisbane";

const fullDateFormatter = new Intl.DateTimeFormat("en-AU", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: BRISBANE_TIMEZONE,
});

const announcementDateFormatter = new Intl.DateTimeFormat("en-AU", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: BRISBANE_TIMEZONE,
});

const timeFormatter = new Intl.DateTimeFormat("en-AU", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: BRISBANE_TIMEZONE,
});

function compactTime(date) {
  return timeFormatter.format(date).replace(":", ".").replace(/\s/g, "").toLowerCase();
}

export function announcementFor(events) {
  if (!events.length) return null;
  if (events.length > 1) {
    return {
      text: "Upcoming Shemotion Experiences - View Dates and Locations",
      action: "View Dates",
    };
  }
  const event = events[0];
  const location = [event.venueName, event.suburb].filter(Boolean).join(", ");
  if (event.dateStatus === "tbc") {
    return {
      text: `Upcoming Shemotion ${event.eventType} - ${location} - Date to be confirmed`,
      action: "View Class",
    };
  }
  const date = new Date(event.startAt);
  return {
    text: `Upcoming Shemotion ${event.eventType} - ${location} - ${announcementDateFormatter.format(date)} at ${compactTime(date)}`,
    action: "View Class",
  };
}

export function eventDestination(event) {
  if (event.availabilityStatus === "Cancelled") return null;
  return event.bookingUrl || "mailto:shemotion.au@gmail.com";
}

function element(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text) node.textContent = options.text;
  return node;
}

export function createEventCard(event) {
  const destination = eventDestination(event);
  const card = element("article", { className: "event-pill" });
  card.dataset.eventId = String(event.id);
  if (event.availabilityStatus === "Cancelled") card.classList.add("is-cancelled");

  const content = element("div", { className: "event-pill-content" });
  const meta = element("div", { className: "event-pill-meta" });
  if (event.dateStatus === "tbc") {
    meta.append(element("span", { text: "Date to be confirmed" }));
  } else {
    const date = new Date(event.startAt);
    meta.append(
      element("span", { text: fullDateFormatter.format(date) }),
      element("span", { text: compactTime(date) })
    );
  }
  if (event.suburb) meta.append(element("span", { text: event.suburb }));
  content.append(
    element("p", { className: "event-pill-venue", text: event.venueName }),
    element("h3", { className: "event-pill-title", text: event.title }),
    meta
  );
  if (["Limited spaces", "Sold out", "Cancelled"].includes(event.availabilityStatus)) {
    content.append(element("span", {
      className: `event-pill-status status-${event.availabilityStatus.toLowerCase().replaceAll(" ", "-")}`,
      text: event.availabilityStatus,
    }));
  }

  const description = event.shortDescription?.trim() === "-" ? "" : event.shortDescription?.trim();
  const hasDetails = Boolean(event.address || description);
  const actions = element("div", { className: "event-pill-actions" });
  let details;
  if (hasDetails) {
    const detailsId = `event-details-${event.id}`;
    const toggle = element("button", { className: "event-details-toggle", text: "Full details" });
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", detailsId);
    actions.append(toggle);

    details = element("div", { className: "event-pill-details" });
    details.id = detailsId;
    details.hidden = true;
    if (event.address) {
      details.append(element("p", { className: "event-pill-address", text: event.address }));
      const mapLink = element("a", { className: "event-map-link", text: "Open in Google Maps" });
      mapLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`;
      mapLink.target = "_blank";
      mapLink.rel = "noopener noreferrer";
      details.append(mapLink);
    }
    if (description) details.append(element("p", { className: "event-pill-description", text: description }));
  }

  if (destination) {
    const action = element("a", {
      className: "event-pill-action",
      text: event.bookingUrl ? "Venue details" : "Email Shemotion",
    });
    action.href = destination;
    if (event.bookingUrl) {
      action.target = "_blank";
      action.rel = "noopener noreferrer";
    }
    actions.append(action);
  }

  card.append(content, actions);
  if (details) card.append(details);
  return card;
}

function setupEventDetails(cards) {
  const closeCard = (card) => {
    const toggle = card.querySelector(".event-details-toggle");
    const details = card.querySelector(".event-pill-details");
    if (!toggle || !details) return;
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "Full details";
    details.hidden = true;
  };

  cards.forEach((card) => {
    const toggle = card.querySelector(".event-details-toggle");
    const details = card.querySelector(".event-pill-details");
    if (!toggle || !details) return;
    toggle.addEventListener("click", () => {
      const willOpen = toggle.getAttribute("aria-expanded") !== "true";
      if (!willOpen) return closeCard(card);
      toggle.setAttribute("aria-expanded", "true");
      toggle.textContent = "Close details";
      details.hidden = false;
    });
  });

  document.addEventListener("click", (event) => {
    cards.forEach((card) => {
      if (!card.contains(event.target)) closeCard(card);
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") cards.forEach(closeCard);
  });
}

function setupReveal(items) {
  if (!items.length) return;
  items.forEach((item, index) => {
    item.classList.add("reveal");
    if (item.matches(".section-heading, .narrow, .contact-shell")) item.classList.add("reveal-soft");
    if (item.matches("blockquote")) item.style.setProperty("--reveal-delay", `${(index % 5) * 90}ms`);
  });

  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
  items.forEach((item) => observer.observe(item));
}

function setupPillRotator(container) {
  const items = [...container.children];
  if (!items.length) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    items.forEach((item) => item.removeAttribute("aria-hidden"));
    return;
  }

  let index = 0;
  const showCurrent = () => {
    const current = items[index];
    current.classList.add("is-active");
    current.setAttribute("aria-hidden", "false");

    window.setTimeout(() => {
      current.classList.remove("is-active");
      current.setAttribute("aria-hidden", "true");
      window.setTimeout(() => {
        index = (index + 1) % items.length;
        showCurrent();
      }, 750);
    }, 3600);
  };

  items.forEach((item) => item.setAttribute("aria-hidden", "true"));
  window.requestAnimationFrame(showCurrent);
}

function renderAnnouncement(events) {
  const bar = document.querySelector(".announcement-bar");
  const content = announcementFor(events);
  if (!bar || !content) {
    bar?.setAttribute("hidden", "");
    return;
  }
  bar.querySelector("[data-announcement-text]").textContent = content.text;
  bar.querySelector("[data-announcement-action]").textContent = content.action;
  bar.removeAttribute("hidden");
}

function setupEventCarousel(list, cards) {
  const controls = document.querySelector("[data-event-controls]");
  if (!controls || cards.length < 2) {
    controls?.setAttribute("hidden", "");
    return;
  }

  const previous = controls.querySelector(".event-arrow-previous");
  const next = controls.querySelector(".event-arrow-next");
  const counter = controls.querySelector(".event-counter");
  let activeIndex = 0;
  let scrollTimer;

  const formatNumber = (value) => String(value).padStart(2, "0");
  const updateControls = () => {
    counter.textContent = `${formatNumber(activeIndex + 1)} / ${formatNumber(cards.length)}`;
    previous.disabled = activeIndex === 0;
    next.disabled = activeIndex === cards.length - 1;
  };
  const goTo = (index) => {
    activeIndex = Math.max(0, Math.min(cards.length - 1, index));
    list.scrollTo({ left: cards[activeIndex].offsetLeft - list.offsetLeft, behavior: "smooth" });
    updateControls();
  };

  previous.addEventListener("click", () => goTo(activeIndex - 1));
  next.addEventListener("click", () => goTo(activeIndex + 1));
  list.addEventListener("scroll", () => {
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      activeIndex = cards.reduce((closest, card, index) => {
        const distance = Math.abs((card.offsetLeft - list.offsetLeft) - list.scrollLeft);
        const closestDistance = Math.abs((cards[closest].offsetLeft - list.offsetLeft) - list.scrollLeft);
        return distance < closestDistance ? index : closest;
      }, 0);
      updateControls();
    }, 80);
  }, { passive: true });

  controls.removeAttribute("hidden");
  updateControls();
}

async function loadPublicEvents() {
  const list = document.querySelector("#events-list");
  if (!list) return;

  try {
    const response = await fetch("api/events", { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error("Events request failed");
    const data = await response.json();
    const events = Array.isArray(data.events) ? data.events : [];
    list.replaceChildren();
    list.setAttribute("aria-busy", "false");
    renderAnnouncement(events);

    if (!events.length) {
      list.append(element("p", {
        className: "events-empty",
        text: "New Shemotion dates are coming soon.",
      }));
      return;
    }

    const cards = events.map(createEventCard);
    list.append(...cards);
    setupEventCarousel(list, cards);
    setupEventDetails(cards);
  } catch {
    list.replaceChildren(element("p", {
      className: "events-empty",
      text: "Upcoming dates could not be loaded right now. Please check back soon.",
    }));
    list.setAttribute("aria-busy", "false");
    renderAnnouncement([]);
    console.error("Shemotion events could not be loaded.");
  }
}

function initialisePage() {
  const header = document.querySelector("[data-header]");
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelectorAll(".site-nav a");
  if (header && navToggle) {
    navToggle.addEventListener("click", () => {
      const isOpen = header.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
    navLinks.forEach((link) => link.addEventListener("click", () => {
      header.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }));
  }

  setupReveal([...document.querySelectorAll(
    ".events .section-heading, .experience .section-heading, .stage, .for-you .narrow, .feedback .section-heading, .quotes blockquote, .coach-grid, .contact-shell"
  )]);
  document.querySelectorAll("[data-pill-rotator]").forEach(setupPillRotator);
  loadPublicEvents();
}

if (typeof document !== "undefined") initialisePage();
