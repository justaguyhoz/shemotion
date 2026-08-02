const list = document.querySelector("[data-event-list]");
const notice = document.querySelector("[data-notice]");
const dialog = document.querySelector("[data-event-dialog]");
const form = document.querySelector("[data-event-form]");
const formError = document.querySelector("[data-form-error]");
const deleteButton = document.querySelector("[data-delete]");
let events = [];

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Australia/Brisbane",
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
  const statuses = [];
  const isPast = Date.parse(event.endAt || event.startAt) < Date.now();
  statuses.push(event.isPublished ? "Published" : "Draft");
  if (isPast) statuses.push("Past");
  if (event.availabilityStatus === "Sold out") statuses.push("Sold out");
  if (event.availabilityStatus === "Cancelled") statuses.push("Cancelled");
  return statuses;
}

function renderEvents() {
  list.replaceChildren();
  if (!events.length) {
    list.append(element("p", { text: "No events yet. Add the first Shemotion experience." }));
    return;
  }

  for (const event of events) {
    const article = element("article", { className: "admin-event" });
    const content = element("div");
    const meta = element("div", { className: "event-meta" });
    for (const status of eventStatuses(event)) {
      const className = status.toLowerCase().replaceAll(" ", "-");
      meta.append(element("span", { className: `status ${className}`, text: status }));
    }
    content.append(meta, element("h3", { text: event.title }));
    content.append(element("p", {
      text: `${event.venueName}${event.suburb ? `, ${event.suburb}` : ""} | ${dateFormatter.format(new Date(event.startAt))}`,
    }));
    content.append(element("p", {
      text: event.bookingUrl ? `Booking link: ${event.bookingUrl}` : "Booking link: not added",
    }));

    const edit = element("button", { className: "edit-button", text: "Edit" });
    edit.type = "button";
    edit.addEventListener("click", () => openForm(event));
    article.append(content, edit);
    list.append(article);
  }
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

async function loadEvents() {
  try {
    const data = await apiRequest("../api/admin/events");
    events = data.events;
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

function openForm(event = null) {
  form.reset();
  formError.textContent = "";
  form.elements.id.value = event?.id || "";
  document.querySelector("[data-form-title]").textContent = event ? "Edit Event" : "Add Event";
  deleteButton.hidden = !event;

  if (event) {
    const start = brisbaneParts(event.startAt);
    const end = brisbaneParts(event.endAt);
    for (const name of ["title", "eventType", "venueName", "suburb", "address", "audience", "shortDescription", "bookingLabel", "bookingUrl", "availabilityStatus", "displayOrder"]) {
      form.elements[name].value = event[name] ?? "";
    }
    form.elements.startDate.value = start.date;
    form.elements.startTime.value = start.time;
    form.elements.endDate.value = end.date;
    form.elements.endTime.value = end.time;
    form.elements.isPublished.checked = event.isPublished;
  } else {
    form.elements.eventType.value = "Class";
    form.elements.audience.value = "Women only";
    form.elements.bookingLabel.value = "Book now";
    form.elements.availabilityStatus.value = "Available";
    form.elements.displayOrder.value = "0";
  }
  dialog.showModal();
}

function toIso(date, time) {
  return date && time ? new Date(`${date}T${time}:00+10:00`).toISOString() : null;
}

function formPayload() {
  const data = new FormData(form);
  const endDate = data.get("endDate");
  const endTime = data.get("endTime");
  if ((endDate && !endTime) || (!endDate && endTime)) throw new Error("Add both an end date and end time, or leave both empty.");
  return {
    title: data.get("title"),
    eventType: data.get("eventType"),
    venueName: data.get("venueName"),
    suburb: data.get("suburb"),
    address: data.get("address"),
    startAt: toIso(data.get("startDate"), data.get("startTime")),
    endAt: toIso(endDate, endTime),
    timezone: "Australia/Brisbane",
    audience: data.get("audience"),
    shortDescription: data.get("shortDescription"),
    bookingLabel: data.get("bookingLabel"),
    bookingUrl: data.get("bookingUrl"),
    availabilityStatus: data.get("availabilityStatus"),
    isPublished: data.get("isPublished") === "on",
    displayOrder: Number(data.get("displayOrder") || 0),
  };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.textContent = "";
  if (!form.reportValidity()) return;
  const id = form.elements.id.value;
  try {
    const payload = formPayload();
    await apiRequest(id ? `../api/admin/events/${id}` : "../api/admin/events", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    dialog.close();
    setNotice(id ? "Event updated." : "Event created.");
    await loadEvents();
  } catch (error) {
    formError.textContent = error.message;
  }
});

deleteButton.addEventListener("click", async () => {
  const id = form.elements.id.value;
  const title = form.elements.title.value;
  if (!id || !window.confirm(`Delete “${title}”? This cannot be undone.`)) return;
  try {
    await apiRequest(`../api/admin/events/${id}`, { method: "DELETE" });
    dialog.close();
    setNotice("Event deleted.");
    await loadEvents();
  } catch (error) {
    formError.textContent = error.message;
  }
});

document.querySelector("[data-new-event]").addEventListener("click", () => openForm());
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => dialog.close()));
loadEvents();
