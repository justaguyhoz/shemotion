import { setupNavigation } from "./navigation.js";
import { addCustomEventClickTracking, eventBookingMetadata } from "./tracking.js";
import { captureContactAttribution } from "./attribution.js";

const BRISBANE_TIMEZONE = "Australia/Brisbane";

const fullDateFormatter = new Intl.DateTimeFormat("en-AU", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
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

export function eventDestination(event) {
  if (event.availabilityStatus === "Cancelled") return null;
  return event.bookingUrl || "#contact";
}

export function eventActionLabel(event) {
  if (!event.bookingUrl) return "Contact Shemotion";
  return "BOOK NOW";
}

export function eventGoogleMapsUrl(event) {
  if (event.googleMapsUrl) return event.googleMapsUrl;
  const query = [event.venueName, event.address, event.suburb].filter(Boolean).join(", ");
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
}

function element(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text) node.textContent = options.text;
  return node;
}

export function createEventCard(event, idPrefix = "event") {
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
  if (event.recurrenceFrequency && event.recurrenceFrequency !== "none") {
    const label = event.recurrenceFrequency === "fortnightly"
      ? "Fortnightly"
      : `${event.recurrenceFrequency.charAt(0).toUpperCase()}${event.recurrenceFrequency.slice(1)}`;
    content.append(element("span", { className: "event-pill-recurrence", text: `${label} series` }));
  }

  const description = event.shortDescription?.trim() === "-" ? "" : event.shortDescription?.trim();
  const hasDetails = Boolean(event.address || description);
  const actions = element("div", { className: "event-pill-actions" });
  let details;
  if (event.slug) {
    const pageLink = element("a", { className: "event-page-link", text: "Event page" });
    pageLink.href = `/events/${encodeURIComponent(event.slug)}/`;
    actions.append(pageLink);
  }
  if (hasDetails) {
    const occurrenceKey = event.occurrenceIndex ?? event.startAt ?? "tbc";
    const detailsId = `${idPrefix}-details-${event.id}-${String(occurrenceKey).replace(/[^a-z0-9]/gi, "")}`;
    const toggle = element("button", { className: "event-details-toggle", text: "Quick details" });
    toggle.type = "button";
    toggle.dataset.eventDetailsToggle = "";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", detailsId);
    actions.append(toggle);

    details = element("div", { className: "event-pill-details" });
    details.id = detailsId;
    details.hidden = true;
    if (event.address) {
      details.append(element("p", { className: "event-pill-address", text: event.address }));
      const googleMapsUrl = eventGoogleMapsUrl(event);
      if (googleMapsUrl) {
        const mapLink = element("a", { className: "event-map-link", text: "Open in Google Maps" });
        mapLink.href = googleMapsUrl;
        mapLink.target = "_blank";
        mapLink.rel = "noopener noreferrer";
        details.append(mapLink);
      }
    }
    if (description) details.append(element("p", { className: "event-pill-description", text: description }));
  }

  if (destination) {
    const action = element("a", {
      className: `event-pill-action${event.bookingUrl ? " button booking-button" : ""}`,
      text: eventActionLabel(event),
    });
    action.href = destination;
    if (event.bookingUrl) {
      action.target = "_blank";
      action.rel = "noopener noreferrer";
      addCustomEventClickTracking(action, "EventBookingClick", () => eventBookingMetadata(event));
    }
    actions.append(action);
  }

  card.append(content, actions);
  if (details) card.append(details);
  return card;
}

function closeEventDetails(card) {
  const toggle = card.querySelector("[data-event-details-toggle]");
  const details = card.querySelector(".event-pill-details");
  if (!toggle || !details) return;
  const wasOpen = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", "false");
  toggle.textContent = "Quick details";
  details.hidden = true;
  if (wasOpen) card.dispatchEvent(new CustomEvent("eventdetailschange", { bubbles: true }));
}

export function setupEventDetails(cards, eventRoot = document) {

  cards.forEach((card) => {
    const toggle = card.querySelector("[data-event-details-toggle]");
    const details = card.querySelector(".event-pill-details");
    if (!toggle || !details) return;
    toggle.addEventListener("click", () => {
      const willOpen = toggle.getAttribute("aria-expanded") !== "true";
      if (!willOpen) return closeEventDetails(card);
      toggle.setAttribute("aria-expanded", "true");
      toggle.textContent = "Close details";
      details.hidden = false;
      card.dispatchEvent(new CustomEvent("eventdetailschange", { bubbles: true }));
    });
  });

  eventRoot.addEventListener("click", (event) => {
    cards.forEach((card) => {
      if (!card.contains(event.target)) closeEventDetails(card);
    });
  });
  eventRoot.addEventListener("keydown", (event) => {
    if (event.key === "Escape") cards.forEach(closeEventDetails);
  });
}

function setupReveal(items) {
  if (!items.length) return;
  items.forEach((item, index) => {
    item.classList.add("reveal");
    if (item.matches(".section-heading, .narrow, .contact-shell")) item.classList.add("reveal-soft");
    if (item.matches("blockquote")) item.style.setProperty("--reveal-delay", `${(index % 5) * 90}ms`);
  });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reveal = (item) => {
    item.addEventListener("transitionend", () => item.style.removeProperty("--reveal-delay"), { once: true });
    item.classList.add("is-visible");
  };

  if (reducedMotion || !("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        reveal(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
  items.forEach((item) => observer.observe(item));
}

export function setupTextRotator(container, { mobileOnly = false, duration = 3600, gap = 750 } = {}, view = window) {
  const items = [...container.children];
  if (items.length < 2) return;
  const reducedMotion = view.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = view.matchMedia("(max-width: 760px)");
  const control = container.ownerDocument.createElement("button");
  control.type = "button";
  control.className = "rotation-control";
  control.setAttribute("aria-controls", container.id);
  container.after(control);
  let index = 0;
  let showAll = false;
  let timer;

  const schedule = () => {
    timer = view.setTimeout(() => {
      items[index].classList.remove("is-active");
      items[index].setAttribute("aria-hidden", "true");
      timer = view.setTimeout(() => {
        index = (index + 1) % items.length;
        render();
      }, gap);
    }, duration);
  };
  const render = () => {
    view.clearTimeout(timer);
    const canRotate = !reducedMotion.matches && (!mobileOnly || mobile.matches);
    const rotating = canRotate && !showAll;
    container.classList.toggle("is-rotating", rotating);
    items.forEach((item, itemIndex) => {
      item.classList.toggle("is-active", rotating && itemIndex === index);
      if (rotating) item.setAttribute("aria-hidden", String(itemIndex !== index));
      else item.removeAttribute("aria-hidden");
    });
    control.hidden = !canRotate;
    control.textContent = showAll ? "Resume rotation" : "Show all";
    control.setAttribute("aria-label", `${showAll ? "Resume rotation of" : "Show all"} ${mobileOnly ? "feedback quotes" : "messages"}`);
    control.setAttribute("aria-pressed", String(showAll));
    if (rotating && !container.ownerDocument.hidden) schedule();
  };
  control.addEventListener("click", () => {
    showAll = !showAll;
    render();
  });
  reducedMotion.addEventListener("change", render);
  mobile.addEventListener("change", render);
  container.ownerDocument.addEventListener("visibilitychange", render);
  render();
}

export function setupFaq(root = document, view = window) {
  const list = root.querySelector("[data-faq-list]");
  if (!list) return;
  const items = [...list.querySelectorAll(".faq-item")];
  const closeTimers = new Map();
  const openFrames = new Map();
  let activeItem = null;

  const close = (item) => {
    if (!item) return;
    const button = item.querySelector("button");
    const answer = item.querySelector(".faq-answer");
    view.cancelAnimationFrame(openFrames.get(item));
    view.clearTimeout(closeTimers.get(item));
    button.setAttribute("aria-expanded", "false");
    button.querySelector("span").textContent = "+";
    answer.classList.remove("is-open");
    answer.inert = true;
    answer.setAttribute("aria-hidden", "true");
    if (view.matchMedia("(prefers-reduced-motion: reduce)").matches) answer.hidden = true;
    else closeTimers.set(item, view.setTimeout(() => {
      answer.hidden = true;
      closeTimers.delete(item);
    }, 240));
    if (activeItem === item) activeItem = null;
  };
  const open = (item) => {
    if (activeItem && activeItem !== item) close(activeItem);
    const button = item.querySelector("button");
    const answer = item.querySelector(".faq-answer");
    view.clearTimeout(closeTimers.get(item));
    view.cancelAnimationFrame(openFrames.get(item));
    answer.hidden = false;
    answer.inert = false;
    answer.removeAttribute("aria-hidden");
    button.setAttribute("aria-expanded", "true");
    button.querySelector("span").textContent = "−";
    activeItem = item;
    openFrames.set(item, view.requestAnimationFrame(() => {
      if (activeItem === item) answer.classList.add("is-open");
      openFrames.delete(item);
    }));
  };

  items.forEach((item) => {
    item.querySelector("button").addEventListener("click", () => {
      if (activeItem === item) close(item);
      else open(item);
    });
  });
  root.addEventListener("click", (event) => {
    if (activeItem && !list.contains(event.target)) close(activeItem);
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeItem) close(activeItem);
  });
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
    list.scrollTo({ left: cards[activeIndex].offsetLeft - list.offsetLeft, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
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
      cards.forEach((card, index) => {
        if (index !== activeIndex) closeEventDetails(card);
      });
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
    const response = await fetch(`api/events?fresh=${Date.now()}`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error("Events request failed");
    const data = await response.json();
    const events = Array.isArray(data.events) ? data.events : [];
    list.replaceChildren();
    list.setAttribute("aria-busy", "false");
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
    console.error("Shemotion events could not be loaded.");
  } finally {
    if (window.location.hash === "#contact") {
      document.querySelector("#contact")?.scrollIntoView();
    }
  }
}

export async function copyEmail(text, clipboard = globalThis.navigator?.clipboard) {
  if (!clipboard?.writeText) throw new Error("Clipboard access is unavailable");
  await clipboard.writeText(text);
}

function setupEmailCopy() {
  document.querySelectorAll("[data-copy-email]").forEach((button) => {
    const status = document.querySelector("[data-copy-email-status]");
    button.addEventListener("click", async () => {
      try {
        await copyEmail(button.dataset.copyEmail);
        if (status) status.textContent = "Email copied";
        button.classList.add("is-copied");
      } catch {
        if (status) status.textContent = "Copy unavailable. Select the email address to copy it.";
      }
    });
  });
}

export async function sendContactEnquiry(payload, fetchImpl = fetch) {
  const response = await fetchImpl("api/contact", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  let result = {};
  try {
    result = await response.json();
  } catch {
    // Keep the visible error generic when an upstream response is malformed.
  }
  if (!response.ok || result.ok !== true) {
    throw new Error(result.error || "Your enquiry could not be sent. Please try again.");
  }
  return result;
}

export function contactFormPayload(form, attribution = {}, uuidFactory = () => crypto.randomUUID()) {
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.marketingConsent = Boolean(form.elements.marketingConsent?.checked);
  payload.submissionId = form.dataset.submissionId || uuidFactory();
  form.dataset.submissionId = payload.submissionId;
  return { ...payload, ...attribution };
}

export function setupContactForm(root = document, fetchImpl = fetch, attribution = captureContactAttribution()) {
  const form = root.querySelector("[data-contact-form]");
  if (!form) return;
  const status = root.querySelector("[data-contact-status]");
  const success = root.querySelector("[data-contact-success]");
  const another = root.querySelector("[data-contact-another]");
  const submit = form.querySelector("button[type='submit']");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const payload = contactFormPayload(form, attribution);
    submit.disabled = true;
    submit.setAttribute("aria-busy", "true");
    status.textContent = "Sending your enquiry…";
    status.classList.remove("is-error");

    try {
      await sendContactEnquiry(payload, fetchImpl);
      form.reset();
      delete form.dataset.submissionId;
      status.textContent = "";
      form.hidden = true;
      success.hidden = false;
      success.focus();
    } catch (error) {
      status.textContent = error.message || "Your enquiry could not be sent. Please try again.";
      status.classList.add("is-error");
    } finally {
      submit.disabled = false;
      submit.removeAttribute("aria-busy");
    }
  });

  another?.addEventListener("click", () => {
    success.hidden = true;
    form.hidden = false;
    form.querySelector("input, select, textarea")?.focus();
  });
}

export function setupInstagramGallery(root = document, view = window) {
  const grid = root.querySelector(".instagram-grid");
  const previous = root.querySelector("[data-instagram-previous]");
  const next = root.querySelector("[data-instagram-next]");
  const counter = root.querySelector("[data-instagram-counter]");
  const cards = grid ? [...grid.querySelectorAll(".instagram-card")] : [];
  if (!grid || !previous || !next || !counter || cards.length < 2) return;

  let activeIndex = 0;
  let updateFrame;
  const reducedMotion = view.matchMedia("(prefers-reduced-motion: reduce)");
  const cardOffset = (card) => card.offsetLeft - grid.offsetLeft;
  const update = () => {
    activeIndex = cards.reduce((closest, card, index) => (
      Math.abs(cardOffset(card) - grid.scrollLeft) < Math.abs(cardOffset(cards[closest]) - grid.scrollLeft) ? index : closest
    ), 0);
    counter.textContent = `${activeIndex + 1} / ${cards.length}`;
    previous.disabled = activeIndex === 0;
    next.disabled = activeIndex === cards.length - 1;
  };
  const requestUpdate = () => {
    view.cancelAnimationFrame(updateFrame);
    updateFrame = view.requestAnimationFrame(update);
  };
  const moveTo = (index) => {
    const target = Math.max(0, Math.min(cards.length - 1, index));
    grid.scrollTo({ left: cardOffset(cards[target]), behavior: reducedMotion.matches ? "auto" : "smooth" });
    activeIndex = target;
    counter.textContent = `${target + 1} / ${cards.length}`;
    previous.disabled = target === 0;
    next.disabled = target === cards.length - 1;
  };

  previous.addEventListener("click", () => moveTo(activeIndex - 1));
  next.addEventListener("click", () => moveTo(activeIndex + 1));
  grid.addEventListener("scroll", requestUpdate, { passive: true });
  view.addEventListener("resize", requestUpdate);
  update();
}

function initialisePage() {
  const contactAttribution = captureContactAttribution();
  const primaryBookNow = document.querySelector("[data-primary-book-now]");
  addCustomEventClickTracking(primaryBookNow, "BookNowClick");

  setupNavigation();

  setupReveal([...document.querySelectorAll(
    ".events .section-heading, .experience .section-heading, .stage, .experience-followup, .for-you .narrow, .feedback .section-heading, .coach-grid, .organisations .section-heading, .organisations .service-card-grid, .contact-shell, .instagram [data-reveal]"
  )]);
  document.querySelectorAll("[data-pill-rotator]").forEach((container) => setupTextRotator(container));
  document.querySelectorAll("[data-quote-rotator]").forEach((container) => setupTextRotator(container, { mobileOnly: true, duration: 3700, gap: 700 }));
  setupFaq();
  setupEmailCopy();
  setupContactForm(document, fetch, contactAttribution);
  setupInstagramGallery();
  loadPublicEvents();
}

if (typeof document !== "undefined") initialisePage();

if (typeof window !== "undefined") {
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) window.location.reload();
  });
}
