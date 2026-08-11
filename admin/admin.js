import { eventDateKey, initialCalendarMonth, monthGrid, monthLabel, moveMonth } from "../calendar.js";
import { expandRecurringEvents } from "../recurrence.js";

const list = document.querySelector("[data-event-list]");
const notice = document.querySelector("[data-notice]");
const dialog = document.querySelector("[data-event-dialog]");
const form = document.querySelector("[data-event-form]");
const formError = document.querySelector("[data-form-error]");
const deleteButton = document.querySelector("[data-delete]");
const duplicateButton = document.querySelector("[data-duplicate]");
const locationSelect = document.querySelector("[data-location-select]");
const templateSelect = document.querySelector("[data-template-select]");
const formGrid = form.querySelector(".form-grid");
let events = [];
let locations = [];
let adminCalendarMonth;
let initialFormState = "";
let allowDialogClose = false;

formGrid.addEventListener("scroll", () => {
  if (formGrid.scrollLeft) formGrid.scrollLeft = 0;
}, { passive: true });

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  weekday: "short", day: "numeric", month: "short", year: "numeric",
  hour: "numeric", minute: "2-digit", timeZone: "Australia/Brisbane",
});
const compactDateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Brisbane",
});
const compactTimeFormatter = new Intl.DateTimeFormat("en-AU", {
  hour: "numeric", minute: "2-digit", timeZone: "Australia/Brisbane",
});

function setNotice(message, isError = false) {
  notice.textContent = message;
  notice.classList.toggle("is-error", isError);
}

function element(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text) node.textContent = options.text;
  return node;
}

function eventStatuses(event) {
  const statuses = [event.isPublished ? "Published" : "Draft"];
  if (event.startAt && Date.parse(event.endAt || event.startAt) < Date.now()) statuses.push("Past");
  if (["Sold out", "Cancelled"].includes(event.availabilityStatus)) statuses.push(event.availabilityStatus);
  return statuses;
}

function eventDateParts(event) {
  if (event.dateStatus === "tbc") return { date: "Date to be confirmed", time: "" };
  const date = new Date(event.startAt);
  return { date: compactDateFormatter.format(date), time: compactTimeFormatter.format(date) };
}

function renderEvents() {
  list.replaceChildren();
  if (!events.length) {
    list.append(element("p", { className: "empty-state", text: "No events yet. Add the first Shemotion experience." }));
    renderAdminCalendar();
    return;
  }

  for (const event of events) {
    const article = element("article", { className: "admin-event" });
    const open = element("button", { className: "admin-event-button" });
    open.type = "button";
    open.setAttribute("aria-label", `Edit ${event.title} at ${event.venueName}`);
    const meta = element("div", { className: "event-meta" });
    for (const status of eventStatuses(event)) {
      meta.append(element("span", {
        className: `status ${status.toLowerCase().replaceAll(" ", "-")}`,
        text: status,
      }));
    }
    const date = eventDateParts(event);
    open.append(
      meta,
      element("p", { className: "admin-event-date", text: date.date }),
      element("p", { className: "admin-event-time", text: date.time || event.eventType }),
      element("h3", { text: event.title }),
      element("p", { className: "admin-event-venue", text: event.venueName }),
      element("span", { className: "admin-event-edit", text: "Edit event" })
    );
    open.addEventListener("click", () => openForm(event));
    article.append(open);
    list.append(article);
  }
  renderAdminCalendar();
}

function renderAdminCalendar() {
  const grid = document.querySelector("[data-admin-calendar-grid]");
  const label = document.querySelector("[data-admin-calendar-label]");
  if (!grid || !label) return;
  adminCalendarMonth ||= initialCalendarMonth(events);
  label.textContent = monthLabel(adminCalendarMonth);
  grid.replaceChildren();
  const days = monthGrid(adminCalendarMonth.year, adminCalendarMonth.month);
  const rangeStart = `${days[0].key}T00:00:00.000Z`;
  const rangeEnd = `${days[days.length - 1].key}T23:59:59.999Z`;
  const occurrences = expandRecurringEvents(events, rangeStart, rangeEnd);
  const eventsByDate = new Map();
  occurrences.forEach((event) => {
    const key = event.dateStatus === "tbc" ? null : eventDateKey(event.startAt);
    if (!key) return;
    if (!eventsByDate.has(key)) eventsByDate.set(key, []);
    eventsByDate.get(key).push(event);
  });

  days.forEach((day) => {
    const cell = element("div", { className: `admin-calendar-day${day.inMonth ? "" : " is-outside"}` });
    const dateButton = element("button", { className: "admin-calendar-date", text: String(day.day) });
    dateButton.type = "button";
    dateButton.setAttribute("aria-label", `Add event on ${day.key}`);
    dateButton.addEventListener("click", () => openForm(null, day.key));
    cell.append(dateButton);
    const dayEvents = eventsByDate.get(day.key) || [];
    if (dayEvents.length) {
      const marker = element("button", { className: "admin-calendar-event", text: String(dayEvents.length) });
      marker.type = "button";
      marker.setAttribute("aria-label", `View ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"} on this date`);
      marker.addEventListener("click", () => openAdminCalendarPopup(dayEvents));
      cell.append(marker);
    }
    grid.append(cell);
  });
}

function openAdminCalendarPopup(dayEvents) {
  const calendarDialog = document.querySelector("[data-admin-calendar-dialog]");
  const track = document.querySelector("[data-admin-calendar-dialog-track]");
  const previous = document.querySelector("[data-admin-calendar-dialog-previous]");
  const next = document.querySelector("[data-admin-calendar-dialog-next]");
  const counter = document.querySelector("[data-admin-calendar-dialog-counter]");
  const cards = dayEvents.map((occurrence) => {
    const master = events.find((event) => String(event.id) === String(occurrence.seriesId || occurrence.id));
    const card = element("article", { className: "admin-calendar-card" });
    card.append(
      element("p", { className: "eyebrow", text: occurrence.venueName }),
      element("h3", { text: occurrence.title }),
      element("p", { text: dateFormatter.format(new Date(occurrence.startAt)) }),
      element("p", { text: [occurrence.suburb, occurrence.address].filter(Boolean).join(" | ") })
    );
    if (master) {
      const edit = element("button", { className: "primary-button", text: occurrence.isRecurringOccurrence ? "Edit series" : "Edit event" });
      edit.type = "button";
      edit.addEventListener("click", () => {
        calendarDialog.close();
        openForm(master);
      });
      card.append(edit);
    }
    return card;
  });
  track.replaceChildren(...cards);
  let index = 0;
  const update = () => {
    counter.textContent = `${index + 1} / ${cards.length}`;
    previous.disabled = index === 0;
    next.disabled = index === cards.length - 1;
  };
  const goTo = (value) => {
    index = Math.max(0, Math.min(cards.length - 1, value));
    track.scrollTo({ left: cards[index].offsetLeft - track.offsetLeft, behavior: "smooth" });
    update();
  };
  previous.onclick = () => goTo(index - 1);
  next.onclick = () => goTo(index + 1);
  track.onscroll = () => {
    index = cards.reduce((closest, card, cardIndex) => {
      const distance = Math.abs((card.offsetLeft - track.offsetLeft) - track.scrollLeft);
      const closestDistance = Math.abs((cards[closest].offsetLeft - track.offsetLeft) - track.scrollLeft);
      return distance < closestDistance ? cardIndex : closest;
    }, 0);
    update();
  };
  update();
  calendarDialog.showModal();
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = Array.isArray(data.details) ? ` ${data.details.join(" ")}` : "";
    throw new Error(`${data.error || "The request failed."}${details}`);
  }
  return data;
}

function populateSelectors() {
  locationSelect.replaceChildren(new Option("Create a new location", "new"));
  locations.forEach((location) => locationSelect.append(new Option(`${location.name} - ${location.suburb || location.address}`, String(location.id))));
  templateSelect.replaceChildren(new Option("Start with a blank event", ""));
  events.forEach((event) => templateSelect.append(new Option(`${event.title} - ${event.venueName}`, String(event.id))));
}

async function loadData() {
  try {
    const [eventData, locationData] = await Promise.all([
      apiRequest("../api/admin/events"),
      apiRequest("../api/admin/locations"),
    ]);
    events = eventData.events;
    locations = locationData.locations;
    populateSelectors();
    renderEvents();
  } catch (error) {
    list.replaceChildren(element("p", { text: "Events could not be loaded." }));
    setNotice(error.message, true);
  }
}

function brisbaneParts(iso) {
  if (!iso) return { date: "", time: "" };
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    hourCycle: "h23", timeZone: "Australia/Brisbane",
  }).formatToParts(new Date(iso));
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

function setLocationMode(value) {
  const location = locations.find((item) => String(item.id) === String(value));
  document.querySelectorAll("[data-location-field]").forEach((field) => {
    field.readOnly = Boolean(location);
  });
  if (location) {
    form.elements.venueName.value = location.name;
    form.elements.suburb.value = location.suburb || "";
    form.elements.address.value = location.address;
  }
}

function applyEventToForm(event, { includeSchedule = true } = {}) {
  for (const name of ["title", "eventType", "audience", "shortDescription", "bookingLabel", "bookingUrl", "availabilityStatus", "displayOrder", "recurrenceFrequency", "recurrenceUntil"]) {
    form.elements[name].value = event[name] ?? "";
  }
  locationSelect.value = event.locationId ? String(event.locationId) : "new";
  if (![...locationSelect.options].some((option) => option.value === locationSelect.value)) locationSelect.value = "new";
  if (locationSelect.value === "new") {
    form.elements.venueName.value = event.venueName || "";
    form.elements.suburb.value = event.suburb || "";
    form.elements.address.value = event.address || "";
  }
  setLocationMode(locationSelect.value);
  form.elements.dateStatus.value = event.dateStatus || "scheduled";
  form.elements.isPublished.checked = Boolean(event.isPublished);
  if (includeSchedule) {
    const start = brisbaneParts(event.startAt);
    const end = brisbaneParts(event.endAt);
    form.elements.startDate.value = start.date;
    form.elements.startTime.value = start.time;
    form.elements.endDate.value = end.date;
    form.elements.endTime.value = end.time;
  }
}

function defaultForm(prefillDate = "") {
  form.elements.eventType.value = "Class";
  form.elements.audience.value = "Women only";
  form.elements.bookingLabel.value = "Book now";
  form.elements.availabilityStatus.value = "Available";
  form.elements.displayOrder.value = "0";
  form.elements.dateStatus.value = "scheduled";
  form.elements.recurrenceFrequency.value = "none";
  form.elements.startDate.value = prefillDate;
  locationSelect.value = "new";
  setLocationMode("new");
}

function currentFormState() {
  return JSON.stringify([...new FormData(form).entries()]);
}

function openForm(event = null, prefillDate = "", options = {}) {
  form.reset();
  formError.textContent = "";
  const duplicate = Boolean(options.duplicate);
  form.elements.id.value = event && !duplicate ? event.id : "";
  document.querySelector("[data-form-title]").textContent = duplicate ? "Duplicate Event" : event ? "Edit Event" : "Add Event";
  deleteButton.hidden = !event || duplicate;
  duplicateButton.hidden = !event || duplicate;
  templateSelect.closest("label").hidden = Boolean(event);
  if (event) {
    applyEventToForm(event);
    if (duplicate) form.elements.isPublished.checked = false;
  } else {
    defaultForm(prefillDate);
  }
  updateDateFields();
  allowDialogClose = false;
  dialog.showModal();
  initialFormState = currentFormState();
}

function requestClose() {
  if (currentFormState() !== initialFormState && !window.confirm("Discard your unsaved changes?")) return;
  allowDialogClose = true;
  dialog.close();
}

function toIso(date, time) {
  return date && time ? new Date(`${date}T${time}:00+10:00`).toISOString() : null;
}

function formPayload(locationId = null) {
  const data = new FormData(form);
  const dateStatus = data.get("dateStatus");
  const endDate = data.get("endDate");
  const endTime = data.get("endTime");
  if (dateStatus === "scheduled" && ((endDate && !endTime) || (!endDate && endTime))) {
    throw new Error("Add both an end date and end time, or leave both empty.");
  }
  return {
    title: data.get("title"), eventType: data.get("eventType"),
    venueName: form.elements.venueName.value, suburb: form.elements.suburb.value,
    address: form.elements.address.value, locationId, dateStatus,
    startAt: dateStatus === "tbc" ? null : toIso(data.get("startDate"), data.get("startTime")),
    endAt: dateStatus === "tbc" ? null : toIso(endDate, endTime),
    timezone: "Australia/Brisbane", audience: data.get("audience"),
    shortDescription: data.get("shortDescription"), bookingLabel: data.get("bookingLabel"),
    bookingUrl: data.get("bookingUrl"), availabilityStatus: data.get("availabilityStatus"),
    isPublished: data.get("isPublished") === "on", displayOrder: Number(data.get("displayOrder") || 0),
    recurrenceFrequency: data.get("recurrenceFrequency"), recurrenceUntil: data.get("recurrenceUntil"),
  };
}

function updateDateFields() {
  const isTbc = form.elements.dateStatus.value === "tbc";
  form.querySelectorAll("[data-date-field]").forEach((field) => {
    field.disabled = isTbc;
    if (isTbc) field.value = "";
  });
  form.elements.startDate.required = !isTbc;
  form.elements.startTime.required = !isTbc;
  form.elements.recurrenceFrequency.disabled = isTbc;
  form.elements.recurrenceUntil.disabled = isTbc;
  if (isTbc) {
    form.elements.recurrenceFrequency.value = "none";
    form.elements.recurrenceUntil.value = "";
  }
}

locationSelect.addEventListener("change", () => setLocationMode(locationSelect.value));
templateSelect.addEventListener("change", () => {
  const template = events.find((event) => String(event.id) === templateSelect.value);
  if (template) applyEventToForm(template, { includeSchedule: false });
  updateDateFields();
});
form.elements.dateStatus.addEventListener("change", updateDateFields);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.textContent = "";
  if (!form.reportValidity()) return;
  const id = form.elements.id.value;
  try {
    let locationId = locationSelect.value === "new" ? null : Number(locationSelect.value);
    if (!locationId && form.elements.address.value.trim()) {
      const result = await apiRequest("../api/admin/locations", {
        method: "POST",
        body: JSON.stringify({
          name: form.elements.venueName.value,
          suburb: form.elements.suburb.value,
          address: form.elements.address.value,
        }),
      });
      locationId = result.location.id;
    }
    await apiRequest(id ? `../api/admin/events/${id}` : "../api/admin/events", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(formPayload(locationId)),
    });
    allowDialogClose = true;
    dialog.close();
    setNotice(id ? "Event updated." : "Event created.");
    await loadData();
  } catch (error) {
    formError.textContent = error.message;
  }
});

deleteButton.addEventListener("click", async () => {
  const id = form.elements.id.value;
  const title = form.elements.title.value;
  if (!id || !window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
  try {
    await apiRequest(`../api/admin/events/${id}`, { method: "DELETE" });
    allowDialogClose = true;
    dialog.close();
    setNotice("Event deleted.");
    await loadData();
  } catch (error) {
    formError.textContent = error.message;
  }
});

duplicateButton.addEventListener("click", () => {
  const source = events.find((event) => String(event.id) === form.elements.id.value);
  if (!source) return;
  allowDialogClose = true;
  dialog.close();
  window.requestAnimationFrame(() => openForm(source, "", { duplicate: true }));
});
document.querySelector("[data-new-event]").addEventListener("click", () => openForm());
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", requestClose));
dialog.addEventListener("cancel", (event) => {
  if (allowDialogClose) return;
  event.preventDefault();
  requestClose();
});
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) requestClose();
});

document.querySelectorAll("[data-admin-view]").forEach((button) => button.addEventListener("click", () => {
  const calendar = button.dataset.adminView === "calendar";
  document.querySelector("[data-admin-list-view]").hidden = calendar;
  document.querySelector("[data-admin-calendar-view]").hidden = !calendar;
  document.querySelectorAll("[data-admin-view]").forEach((viewButton) => {
    const active = viewButton === button;
    viewButton.classList.toggle("is-active", active);
    viewButton.setAttribute("aria-pressed", String(active));
  });
  if (calendar) renderAdminCalendar();
}));
document.querySelector("[data-admin-calendar-previous]").addEventListener("click", () => {
  adminCalendarMonth = moveMonth(adminCalendarMonth || initialCalendarMonth(events), -1);
  renderAdminCalendar();
});
document.querySelector("[data-admin-calendar-next]").addEventListener("click", () => {
  adminCalendarMonth = moveMonth(adminCalendarMonth || initialCalendarMonth(events), 1);
  renderAdminCalendar();
});
const adminCalendarDialog = document.querySelector("[data-admin-calendar-dialog]");
document.querySelector("[data-admin-calendar-dialog-close]").addEventListener("click", () => adminCalendarDialog.close());
adminCalendarDialog.addEventListener("click", (event) => {
  if (event.target === adminCalendarDialog) adminCalendarDialog.close();
});

loadData();
