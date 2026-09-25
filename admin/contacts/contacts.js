const filters = document.querySelector("[data-contact-filters]");
const status = document.querySelector("[data-contacts-status]");
const workspace = document.querySelector("[data-contacts-workspace]");
const list = document.querySelector("[data-contacts-list]");
const detail = document.querySelector("[data-contact-detail]");
const editForm = document.querySelector("[data-contact-edit-form]");
const createDialog = document.querySelector("[data-contact-create-dialog]");
const createForm = document.querySelector("[data-contact-create-form]");
const typeLabels = {
  consumer: "Consumer", organisation: "Organisation", media: "Media",
  hr_people_culture: "HR / People & Culture", event_organiser: "Event organiser", other: "Other",
};
const marketingLabels = { subscribed: "Subscribed", not_given: "Not subscribed", unsubscribed: "Unsubscribed" };
const sourcePlatformLabels = {
  google_ads: "Google Ads", google_organic: "Google Organic", facebook_ads: "Facebook Ads",
  facebook_organic: "Facebook Organic", instagram_ads: "Instagram Ads", instagram_organic: "Instagram Organic",
  outreach: "Outreach", referral: "Referral", event: "Event", direct: "Direct", email: "Email",
  other: "Other", unknown: "Unknown",
};
let contacts = [];
let selectedContactId = "";

function element(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  return node;
}

function displayDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Not recorded" : date.toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: "Australia/Brisbane" });
}

function displayName(contact) {
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email;
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: { accept: "application/json", ...(options.body ? { "content-type": "application/json" } : {}) },
  });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) {
    const error = new Error(data.error || "The request could not be completed.");
    if (data.existingContactId) error.existingContactId = data.existingContactId;
    throw error;
  }
  return data;
}

function renderContacts() {
  list.replaceChildren();
  document.querySelector("[data-contact-count]").textContent = `${contacts.length} contact${contacts.length === 1 ? "" : "s"}`;
  if (!contacts.length) {
    list.append(element("p", { className: "empty-state", text: "No contacts match these filters." }));
    return;
  }
  contacts.forEach((contact) => {
    const button = element("button", { className: `contact-list-item${String(contact.id) === selectedContactId ? " is-active" : ""}` });
    button.type = "button";
    button.append(
      element("strong", { text: displayName(contact) }),
      element("span", { text: contact.email }),
      ...(contact.phone ? [element("span", { text: contact.phone })] : []),
      element("span", { className: "contact-list-meta", text: `${typeLabels[contact.contactType] || "Other"} · ${marketingLabels[contact.marketingStatus]}` }),
      element("span", { className: "contact-list-date", text: `Source ${sourcePlatformLabels[contact.sourcePlatform] || "Unknown"}` }),
      element("span", { className: "contact-list-date", text: `Source detail ${contact.firstSource || "Not recorded"}` }),
      element("span", { className: "contact-list-date", text: `First contact ${displayDate(contact.firstContactAt)}` }),
      element("span", { className: "contact-list-date", text: `Last activity ${displayDate(contact.lastActivityAt)}` })
    );
    button.addEventListener("click", () => openContact(contact.id));
    list.append(button);
  });
}

function addDefinition(listNode, term, description) {
  listNode.append(element("dt", { text: term }), element("dd", { text: description || "Not recorded" }));
}

function safeLink(url, label) {
  try {
    const parsed = new URL(url);
    if (!new Set(["http:", "https:"]).has(parsed.protocol)) return document.createTextNode(label);
    const link = element("a", { text: label });
    link.href = parsed.toString();
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  } catch {
    return document.createTextNode(label);
  }
}

function renderConsent(contact, consents) {
  document.querySelector("[data-consent-status]").textContent = marketingLabels[contact.marketingStatus];
  const details = document.querySelector("[data-consent-details]");
  details.replaceChildren();
  addDefinition(details, "Consent date", contact.marketingConsentAt ? displayDate(contact.marketingConsentAt) : "Not applicable");
  addDefinition(details, "Source", contact.marketingConsentSource || "Not applicable");
  addDefinition(details, "Wording version", contact.marketingConsentVersion || "Not applicable");
  addDefinition(details, "Recorded wording", contact.marketingConsentText || "No marketing consent recorded");
  const history = document.querySelector("[data-consent-history]");
  history.replaceChildren();
  if (consents.length) {
    history.append(element("h4", { text: "Consent history" }));
    consents.forEach((consent) => history.append(element("p", { text: `${displayDate(consent.recordedAt)} · ${consent.status === "granted" ? "Granted" : "Withdrawn"} · ${consent.source}` })));
  }
}

function renderAttribution(enquiry) {
  const values = [
    ["Source", enquiry.source], ["Page", enquiry.sourceUrl], ["Referrer", enquiry.referrerUrl], ["UTM source", enquiry.utmSource],
    ["UTM medium", enquiry.utmMedium], ["UTM campaign", enquiry.utmCampaign],
    ["UTM content", enquiry.utmContent], ["UTM term", enquiry.utmTerm],
  ].filter(([, value]) => value);
  const wrapper = element("dl", { className: "activity-attribution" });
  values.forEach(([term, value]) => {
    wrapper.append(element("dt", { text: term }));
    const description = element("dd");
    description.append(["Page", "Referrer"].includes(term) ? safeLink(value, value) : document.createTextNode(value));
    wrapper.append(description);
  });
  return wrapper;
}

function renderActivity(enquiries) {
  const activity = document.querySelector("[data-activity-list]");
  activity.replaceChildren();
  document.querySelector("[data-activity-count]").textContent = `${enquiries.length} interaction${enquiries.length === 1 ? "" : "s"}`;
  if (!enquiries.length) return activity.append(element("p", { className: "empty-state", text: "No enquiries recorded." }));
  enquiries.forEach((enquiry) => {
    const article = element("article", { className: "activity-card" });
    const heading = element("div", { className: "activity-card-heading" });
    heading.append(element("div", { text: displayDate(enquiry.submittedAt) }), element("strong", { text: enquiry.enquiryType }));
    const message = element("p", { className: "activity-message", text: enquiry.message });
    const form = element("form", { className: "activity-edit-form" });
    const statusLabel = element("label", { text: "Status" });
    const select = element("select");
    select.name = "status";
    ["new", "reviewed", "replied", "closed"].forEach((value) => {
      const option = element("option", { text: value[0].toUpperCase() + value.slice(1) });
      option.value = value;
      option.selected = value === enquiry.status;
      select.append(option);
    });
    statusLabel.append(select);
    const notesLabel = element("label", { text: "Internal notes" });
    const notes = element("textarea");
    notes.name = "adminNotes";
    notes.rows = 3;
    notes.maxLength = 5000;
    notes.value = enquiry.adminNotes || "";
    notesLabel.append(notes);
    const feedback = element("p", { className: "activity-feedback" });
    const save = element("button", { className: "text-button", text: "Save activity" });
    save.type = "submit";
    form.append(statusLabel, notesLabel, feedback, save);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      save.disabled = true;
      feedback.textContent = "Saving...";
      try {
        await apiRequest(`../../api/admin/enquiries/${enquiry.id}`, { method: "PUT", body: JSON.stringify({ status: select.value, adminNotes: notes.value }) });
        feedback.textContent = "Saved";
      } catch (error) { feedback.textContent = error.message; feedback.classList.add("is-error"); }
      finally { save.disabled = false; }
    });
    article.append(
      heading, message,
      element("p", { className: "notification-state", text: `Acquisition source: ${sourcePlatformLabels[enquiry.sourcePlatform] || "Unknown"}` }),
      renderAttribution(enquiry),
      element("p", { className: "notification-state", text: `Notification: ${enquiry.notificationRequired ? enquiry.notificationStatus : "not required"}` }),
      form
    );
    activity.append(article);
  });
}

async function openContact(id, updateHistory = true) {
  selectedContactId = String(id);
  renderContacts();
  status.textContent = "Loading contact...";
  try {
    const data = await apiRequest(`../../api/admin/contacts/${id}`);
    const contact = data.contact;
    document.querySelector("[data-contact-title]").textContent = displayName(contact);
    document.querySelector("[data-contact-email]").textContent = contact.email;
    for (const name of ["id", "firstName", "lastName", "phone", "contactType", "status", "adminNotes"]) editForm.elements[name].value = contact[name] ?? "";
    const meta = document.querySelector("[data-contact-meta]");
    meta.replaceChildren();
    const sourcePlatform = element("p", { text: `Acquisition source: ${sourcePlatformLabels[contact.sourcePlatform] || "Unknown"}` });
    const source = element("p", { text: `Source detail: ${contact.firstSource}` });
    if (contact.firstSourceUrl) source.append(" · ", safeLink(contact.firstSourceUrl, "Open source page"));
    meta.append(sourcePlatform, source, element("p", { text: `First contact: ${displayDate(contact.firstContactAt)}` }), element("p", { text: `Last activity: ${displayDate(contact.lastActivityAt)}` }));
    renderConsent(contact, data.consents);
    renderActivity(data.enquiries);
    detail.hidden = false;
    detail.scrollIntoView({ block: "start" });
    status.textContent = "";
    if (updateHistory) history.replaceState(null, "", `?contact=${encodeURIComponent(id)}`);
  } catch (error) { status.textContent = error.message; status.classList.add("is-error"); }
}

async function loadContacts() {
  status.textContent = "Loading contacts...";
  status.classList.remove("is-error");
  try {
    const query = new URLSearchParams(new FormData(filters));
    const data = await apiRequest(`../../api/admin/contacts?${query}`);
    contacts = data.contacts;
    workspace.hidden = false;
    renderContacts();
    status.textContent = "";
    const requested = new URL(location.href).searchParams.get("contact");
    if (requested && requested !== selectedContactId) await openContact(requested, false);
  } catch (error) { status.textContent = error.message; status.classList.add("is-error"); }
}

filters.addEventListener("submit", (event) => { event.preventDefault(); selectedContactId = ""; detail.hidden = true; history.replaceState(null, "", location.pathname); loadContacts(); });
filters.querySelectorAll("select").forEach((select) => select.addEventListener("change", () => filters.requestSubmit()));
document.querySelector("[data-contact-close]").addEventListener("click", () => { selectedContactId = ""; detail.hidden = true; history.replaceState(null, "", location.pathname); renderContacts(); list.querySelector("button")?.focus(); });
editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const errorNode = document.querySelector("[data-contact-edit-error]");
  errorNode.textContent = "";
  const submit = editForm.querySelector("button[type='submit']");
  submit.disabled = true;
  try {
    const payload = Object.fromEntries(new FormData(editForm).entries());
    await apiRequest(`../../api/admin/contacts/${payload.id}`, { method: "PUT", body: JSON.stringify(payload) });
    await loadContacts();
    await openContact(payload.id, false);
  } catch (error) { errorNode.textContent = error.message; }
  finally { submit.disabled = false; }
});

function dateTimeToIso(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toISOString();
}

function setInitialEnquiryVisibility() {
  const enabled = createForm.elements.includeEnquiry.checked;
  const fields = document.querySelector("[data-initial-enquiry-fields]");
  fields.hidden = !enabled;
  createForm.elements.enquiryType.required = enabled;
  createForm.elements.message.required = enabled;
}

function closeCreateDialog() {
  createDialog.close();
  createForm.reset();
  document.querySelector("[data-contact-create-error]").textContent = "";
  document.querySelector("[data-existing-contact]").hidden = true;
  setInitialEnquiryVisibility();
}

document.querySelector("[data-add-contact]").addEventListener("click", () => {
  createForm.reset();
  document.querySelector("[data-contact-create-error]").textContent = "";
  document.querySelector("[data-existing-contact]").hidden = true;
  setInitialEnquiryVisibility();
  createDialog.showModal();
  createForm.elements.firstName.focus();
});
document.querySelector("[data-contact-create-close]").addEventListener("click", closeCreateDialog);
document.querySelector("[data-contact-create-cancel]").addEventListener("click", closeCreateDialog);
document.querySelector("[data-initial-enquiry-toggle]").addEventListener("change", setInitialEnquiryVisibility);
createForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!createForm.reportValidity()) return;
  const errorNode = document.querySelector("[data-contact-create-error]");
  const existingLink = document.querySelector("[data-existing-contact]");
  const submit = createForm.querySelector("button[type='submit']");
  errorNode.textContent = "";
  existingLink.hidden = true;
  submit.disabled = true;
  try {
    const payload = Object.fromEntries(new FormData(createForm).entries());
    payload.includeEnquiry = createForm.elements.includeEnquiry.checked;
    payload.originalContactAt = dateTimeToIso(payload.originalContactAt);
    payload.enquiryAt = dateTimeToIso(payload.enquiryAt);
    const data = await apiRequest("../../api/admin/contacts", { method: "POST", body: JSON.stringify(payload) });
    createDialog.close();
    createForm.reset();
    selectedContactId = String(data.contactId);
    await loadContacts();
    await openContact(data.contactId);
    status.textContent = "Contact created.";
  } catch (error) {
    errorNode.textContent = error.message;
    if (error.existingContactId) {
      existingLink.href = `?contact=${encodeURIComponent(error.existingContactId)}`;
      existingLink.hidden = false;
    }
  } finally { submit.disabled = false; }
});

loadContacts();
