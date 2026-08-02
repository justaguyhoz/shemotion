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
  const date = new Date(event.startAt);
  const location = [event.venueName, event.suburb].filter(Boolean).join(", ");
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
  const card = element(destination ? "a" : "article", { className: "event-pill" });
  card.dataset.eventId = String(event.id);
  if (destination) card.href = destination;
  if (event.bookingUrl) {
    card.target = "_blank";
    card.rel = "noopener noreferrer";
  }
  if (event.availabilityStatus === "Cancelled") card.classList.add("is-cancelled");

  const date = new Date(event.startAt);
  const content = element("span", { className: "event-pill-content" });
  const meta = element("span", { className: "event-pill-meta" });
  meta.append(
    element("span", { text: fullDateFormatter.format(date) }),
    element("span", { text: compactTime(date) }),
    element("span", { text: [event.venueName, event.suburb].filter(Boolean).join(", ") })
  );
  content.append(element("span", { className: "event-pill-title", text: event.title }), meta);
  if (["Limited spaces", "Sold out", "Cancelled"].includes(event.availabilityStatus)) {
    content.append(element("span", {
      className: `event-pill-status status-${event.availabilityStatus.toLowerCase().replaceAll(" ", "-")}`,
      text: event.availabilityStatus,
    }));
  }

  const action = event.availabilityStatus === "Cancelled"
    ? "Cancelled"
    : event.bookingUrl ? "View venue details" : "Email Shemotion for details";
  card.append(content, element("span", { className: "event-pill-action", text: action }));
  return card;
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
    setupReveal(cards);
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
  loadPublicEvents();
}

if (typeof document !== "undefined") initialisePage();
