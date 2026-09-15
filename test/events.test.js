import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { copyEmail, eventActionLabel, eventDestination, eventGoogleMapsUrl, setupEventDetails } from "../script.js";
import { addCustomEventClickTracking, eventBookingMetadata, trackCustomEvent } from "../tracking.js";
import { generateEventSlug, validateEventInput } from "../shared/events.js";
import { eventJsonLd, formatEventTime } from "../shared/public-pages.js";
import { verifyAccessRequest } from "../shared/access.js";
import { onRequestGet as getPublicEvents } from "../functions/api/events.js";
import { eventDateKey, monthGrid, moveMonth } from "../calendar.js";
import { expandRecurringEvents } from "../recurrence.js";
import { rowToLocation, validateLocationInput } from "../shared/locations.js";
import { onRequestPost as createLocation } from "../functions/api/admin/locations/index.js";
import { onRequestPut as updateLocation } from "../functions/api/admin/locations/[id].js";
import { placeDetailsToLocation, placePredictionSummary } from "../shared/google-places.js";
import { onRequestGet as getEventPage } from "../functions/events/[slug].js";
import { onRequestGet as getSitemap } from "../functions/sitemap.xml.js";

const baseEvent = {
  id: 1,
  title: "Special Introductory Class",
  eventType: "Class",
  venueName: "Reinvigr8 Gym",
  suburb: "Helensvale",
  dateStatus: "scheduled",
  startAt: "2026-08-18T23:15:00.000Z",
  endAt: null,
  timezone: "Australia/Brisbane",
  audience: "Women only",
  shortDescription: "A supportive movement experience.",
  bookingLabel: "Book with Reinvigr8",
  bookingUrl: null,
  availabilityStatus: "Limited spaces",
  isPublished: true,
  displayOrder: 0,
  recurrenceFrequency: "none",
  recurrenceUntil: null,
  slug: "special-introductory-class-helensvale",
};

test("public homepage installs one Meta Pixel PageView and marks only the primary Book Now CTA", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const adminHtml = await readFile(new URL("../admin/index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(html, /4344672809106563/);
  assert.equal((html.match(/fbq\('track', 'PageView'\)/g) || []).length, 1);
  assert.match(html, /<a class="button booking-button" href="#upcoming-events" data-primary-book-now>Book Now<\/a>/);
  assert.equal((html.match(/data-primary-book-now/g) || []).length, 1);
  assert.equal((html.match(/href="#upcoming-events"/g) || []).length, 1);
  assert.ok(
    html.indexOf('id="upcoming-events"') < html.indexOf('class="hero section-pad"'),
    "upcoming events should appear before the hero section"
  );
  assert.doesNotMatch(html, /announcement-bar|data-announcement-/);
  assert.match(
    html,
    /<nav class="site-nav"[^>]*>\s*<a href="\/events\/">Events<\/a>\s*<a href="\/private-groups-retreats\/">Private Groups<\/a>\s*<a href="\/what-is-feminine-movement-meditation\/">The Approach<\/a>/
  );
  assert.doesNotMatch(html, /<a href="#upcoming-events"[^>]*data-primary-book-now[^>]*>Upcoming<\/a>/);
  assert.match(html, /<a href="#experience">Experience<\/a>/);
  assert.match(html, /<a href="#coach">Meet Katty<\/a>/);
  assert.match(html, /<a class="header-cta" href="#contact">Contact Shemotion<\/a>/);
  assert.doesNotMatch(html, /event-view-switch|data-events-view=/);
  assert.match(html, /data-events-list-view/);
  assert.match(html, /data-events-calendar-view hidden/);
  assert.match(html, /data-events-map-view hidden/);
  assert.doesNotMatch(html.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)[0], />Contact<\/a>/);
  assert.match(html, /<h2 id="experience-title">The Shemotion Experience<\/h2>\s*<p>Move, release tension and reconnect\.<\/p>/);
  assert.match(html, /Want to understand the practice more deeply\?/);
  assert.match(html, /href="\/what-is-feminine-movement-meditation\/">What is Feminine Movement Meditation\?<\/a>/);
  const stageThreeIndex = html.indexOf("<h3>Grounding Meditation</h3>");
  const guideLinkIndex = html.indexOf(">What is Feminine Movement Meditation?</a>");
  const nextSectionIndex = html.indexOf('<section class="for-you');
  assert.ok(stageThreeIndex < guideLinkIndex && guideLinkIndex < nextSectionIndex, "guide link should follow the complete three-stage experience");
  assert.match(css, /\.booking-button::after[\s\S]*animation: booking-button-glow 4\.4s/);
  assert.match(css, /\.event-pill-action\.button\.booking-button\s*\{[\s\S]*min-height: 30px;[\s\S]*font-size: 0\.68rem;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.booking-button::after[\s\S]*animation: none/);
  assert.match(html, /<script>document\.documentElement\.classList\.add\("reveal-ready"\)<\/script>\s*<link rel="stylesheet"/);
  assert.match(css, /html\.reveal-ready \[data-reveal\][\s\S]*opacity: 0;[\s\S]*translateY\(14px\)/);
  assert.match(css, /opacity 440ms cubic-bezier/);
  assert.match(css, /html\.reveal-ready \[id="upcoming-events"\] \.section-heading/);
  assert.doesNotMatch(css, /html\.reveal-ready \.events \.section-heading/);
  assert.doesNotMatch(css, /guide-content-reveal|service-card-reveal/);
  assert.doesNotMatch(adminHtml, /4344672809106563|connect\.facebook\.net|facebook\.com\/tr/);
});

test("feminine movement meditation guide has complete metadata and internal paths", async () => {
  const html = await readFile(new URL("../what-is-feminine-movement-meditation/index.html", import.meta.url), "utf8");
  const privateGroupsHtml = await readFile(new URL("../private-groups-retreats/index.html", import.meta.url), "utf8");
  const sharedPagesSource = await readFile(new URL("../shared/public-pages.js", import.meta.url), "utf8");
  assert.match(html, /<title>What Is Feminine Movement Meditation\? \| Shemotion Gold Coast<\/title>/);
  assert.match(html, /<meta name="description" content="Learn what feminine movement meditation is, how a Shemotion session works, and how guided movement, intuitive expression and grounding meditation come together\.">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/shemotion\.com\.au\/what-is-feminine-movement-meditation\/">/);
  assert.match(html, /<meta property="og:title" content="What Is Feminine Movement Meditation\? \| Shemotion Gold Coast">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/shemotion\.com\.au\/what-is-feminine-movement-meditation\/">/);
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(html, /href="\/events\/">View Upcoming Events<\/a>/);
  assert.match(html, /href="\/private-groups-retreats\/">Private Groups &amp; Retreats<\/a>/);
  assert.match(html, /href="\/">Shemotion<\/a>/);
  assert.match(html, /<h2 id="modes-title">Guided Movement and Intuitive Movement<\/h2>/);
  assert.match(html, /A Shemotion session moves from guided movement into intuitive movement and finishes with grounding meditation\./);
  assert.match(html, /<h2 id="dance-title">Is It a Dance Class\?<\/h2><p class="guide-answer">No - and that's an important distinction\.<\/p>/);
  assert.doesNotMatch(html, /guide-stages|\/assets\/step-[123]\.jpg|How a Shemotion Session Works/);
  assert.match(html, /href="\/what-is-feminine-movement-meditation\/" aria-current="page">The Approach<\/a>/);
  assert.match(privateGroupsHtml, /href="\/what-is-feminine-movement-meditation\/">The Approach<\/a>/);
  assert.match(sharedPagesSource, /href="\/what-is-feminine-movement-meditation\/">The Approach<\/a>/);
  assert.match(html, /<img src="\/assets\/studio-1\.jpg" alt="Katty seated in a studio with a group of women behind her">/);
  assert.doesNotMatch(html, /FAQPage|"@type":"FAQPage"/);
});

test("public events page uses the compact requested introduction", async () => {
  const source = await readFile(new URL("../functions/events/index.js", import.meta.url), "utf8");
  assert.match(source, /<p class="eyebrow">Upcoming events<\/p><h1>Shemotion Classes &amp; Workshops<\/h1><p>Feminine movement meditation experiences across the Gold Coast\.<\/p>/);
});

test("public contact paths, visible punctuation and email copying follow the sitewide policy", async () => {
  const paths = [
    "../index.html",
    "../private-groups-retreats/index.html",
    "../what-is-feminine-movement-meditation/index.html",
    "../shared/public-pages.js",
    "../functions/events/index.js",
    "../functions/events/[slug].js",
  ];
  const sources = await Promise.all(paths.map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  sources.forEach((source) => assert.doesNotMatch(source, /mailto:/));

  const [homepage, privateGroups, guide, sharedPages, eventsPage, eventPage] = sources;
  [homepage, privateGroups, guide].forEach((html) => {
    const header = html.match(/<header class="site-header"[\s\S]*?<\/header>/)[0];
    assert.equal((header.match(/Contact Shemotion/g) || []).length, 1);
    assert.doesNotMatch(header.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)[0], />Contact<\/a>/);
  });
  assert.match(homepage, /data-copy-email="shemotion\.au@gmail\.com"/);
  assert.match(homepage, /data-copy-email-status role="status" aria-live="polite"/);
  assert.match(await readFile(new URL("../script.js", import.meta.url), "utf8"), /finally \{[\s\S]*window\.location\.hash === "#contact"[\s\S]*scrollIntoView/);
  assert.doesNotMatch(homepage, /Contact Me For a Tailored Quote/);
  assert.match(privateGroups, /href="\/#contact" data-private-enquiry>Discuss your event<\/a>/);
  assert.match(privateGroups, /href="\/#contact" data-private-enquiry>Go to contact details<\/a>/);
  assert.match(sharedPages, /class="header-cta" href="\/#contact">Contact Shemotion<\/a>/);
  assert.match(eventsPage, /href="\/#contact">Contact Shemotion<\/a>/);
  assert.match(eventPage, /href="\/#contact">Contact Shemotion<\/a>/);

  const visibleText = (html) => html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/<[^>]+>/g, " ");
  [homepage, privateGroups, guide].forEach((html) => assert.doesNotMatch(visibleText(html), /--|[—–]|&(?:mdash|ndash);/));
  assert.equal(formatEventTime({ startAt: "2026-09-20T00:00:00.000Z", endAt: "2026-09-20T01:00:00.000Z" }).includes(" - "), true);

  let copied = "";
  await copyEmail("shemotion.au@gmail.com", { writeText: async (value) => { copied = value; } });
  assert.equal(copied, "shemotion.au@gmail.com");

  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(css, /--green:\s*#[0-9a-f]+;/i);
  assert.match(css, /var\(--green\)/);
});

test("event slugs are SEO-friendly and remain explicit when supplied", () => {
  assert.equal(generateEventSlug("Release & Reconnect", "Tallai"), "release-and-reconnect-tallai");
  const generated = validateEventInput({ ...baseEvent, slug: "" });
  assert.equal(generated.event.slug, "special-introductory-class-helensvale");
  const invalid = validateEventInput({ ...baseEvent, slug: "Changing URL" });
  assert.ok(invalid.errors.some((error) => error.includes("slug")));
});

test("custom click tracking fires once without interfering with the click", () => {
  const calls = [];
  const target = { fbq: (...args) => calls.push(args) };
  const link = new EventTarget();
  addCustomEventClickTracking(link, "BookNowClick", {}, target);
  const click = new Event("click", { cancelable: true });
  assert.equal(link.dispatchEvent(click), true);
  assert.equal(click.defaultPrevented, false);
  assert.deepEqual(calls, [["trackCustom", "BookNowClick", {}]]);
});

test("tracking is safe when fbq is missing or throws", () => {
  assert.equal(trackCustomEvent("BookNowClick", {}, {}), false);
  assert.doesNotThrow(() => trackCustomEvent("BookNowClick", {}, { fbq: () => { throw new Error("blocked"); } }));

  const link = new EventTarget();
  addCustomEventClickTracking(link, "BookNowClick", {}, {});
  assert.equal(link.dispatchEvent(new Event("click", { cancelable: true })), true);
});

test("event booking tracking sends non-sensitive metadata once", () => {
  assert.deepEqual(eventBookingMetadata(baseEvent), {
    event_id: "1",
    event_name: "Special Introductory Class",
    event_type: "Class",
    venue_name: "Reinvigr8 Gym",
    suburb: "Helensvale",
  });

  const calls = [];
  const link = new EventTarget();
  addCustomEventClickTracking(
    link,
    "EventBookingClick",
    () => eventBookingMetadata(baseEvent),
    { fbq: (...args) => calls.push(args) }
  );
  link.dispatchEvent(new Event("click"));
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ["trackCustom", "EventBookingClick", eventBookingMetadata(baseEvent)]);
});

test("central event-card implementation tracks only genuine booking URLs", async () => {
  const source = await readFile(new URL("../script.js", import.meta.url), "utf8");
  assert.equal((source.match(/"EventBookingClick"/g) || []).length, 1);
  assert.match(source, /if \(event\.bookingUrl\) \{[\s\S]*addCustomEventClickTracking\(action, "EventBookingClick"/);
  assert.doesNotMatch(source, /mailto:shemotion\.au@gmail\.com[\s\S]{0,250}EventBookingClick/);
});

test("event pills use the venue link or homepage contact section without dead booking controls", () => {
  assert.equal(eventDestination(baseEvent), "#contact");
  assert.equal(eventActionLabel(baseEvent), "Contact Shemotion");
  assert.equal(eventDestination({ ...baseEvent, availabilityStatus: "Cancelled" }), null);
  const bookable = { ...baseEvent, bookingUrl: "https://example.com/class" };
  assert.equal(eventDestination(bookable), "https://example.com/class");
  assert.equal(eventActionLabel(bookable), "BOOK NOW");
  assert.equal(eventActionLabel({ ...bookable, bookingLabel: "" }), "BOOK NOW");
});

function eventDetailsCardStub() {
  const toggle = new EventTarget();
  const attributes = new Map([["aria-expanded", "false"]]);
  toggle.getAttribute = (name) => attributes.get(name) ?? null;
  toggle.setAttribute = (name, value) => attributes.set(name, String(value));
  toggle.textContent = "Quick details";
  const details = { hidden: true };
  const card = new EventTarget();
  card.querySelector = (selector) => selector === "[data-event-details-toggle]" ? toggle : selector === ".event-pill-details" ? details : null;
  card.contains = (target) => target === toggle;
  return { card, details, toggle };
}

test("event-card controls remain mutually exclusive and cards toggle independently", async () => {
  const first = eventDetailsCardStub();
  const second = eventDetailsCardStub();
  const eventRoot = new EventTarget();
  setupEventDetails([first.card, second.card], eventRoot);

  const quickDetailsClick = new Event("click", { cancelable: true });
  first.toggle.dispatchEvent(quickDetailsClick);
  assert.equal(quickDetailsClick.defaultPrevented, false);
  assert.equal(first.toggle.getAttribute("aria-expanded"), "true");
  assert.equal(first.toggle.textContent, "Close details");
  assert.equal(first.details.hidden, false);
  assert.equal(second.toggle.getAttribute("aria-expanded"), "false");
  assert.equal(second.details.hidden, true);

  second.toggle.dispatchEvent(new Event("click", { cancelable: true }));
  assert.equal(first.toggle.getAttribute("aria-expanded"), "true");
  assert.equal(first.details.hidden, false);
  assert.equal(second.toggle.getAttribute("aria-expanded"), "true");
  assert.equal(second.details.hidden, false);

  second.toggle.dispatchEvent(new Event("click", { cancelable: true }));
  assert.equal(second.toggle.getAttribute("aria-expanded"), "false");
  assert.equal(second.details.hidden, true);

  first.toggle.dispatchEvent(new Event("click", { cancelable: true }));
  assert.equal(first.toggle.getAttribute("aria-expanded"), "false");
  assert.equal(first.toggle.textContent, "Quick details");
  assert.equal(first.details.hidden, true);

  const source = await readFile(new URL("../script.js", import.meta.url), "utf8");
  assert.match(source, /className: "event-page-link", text: "Event page"/);
  assert.match(source, /toggle\.dataset\.eventDetailsToggle = ""/);
  assert.doesNotMatch(source, /card\.querySelector\("\.event-details-toggle"\)/);

  const eventPageClick = new Event("click", { cancelable: true });
  new EventTarget().dispatchEvent(eventPageClick);
  assert.equal(eventPageClick.defaultPrevented, false);
  assert.equal(first.details.hidden, true);

  const bookingClick = new Event("click", { cancelable: true });
  new EventTarget().dispatchEvent(bookingClick);
  assert.equal(bookingClick.defaultPrevented, false);
  assert.equal(first.details.hidden, true);
});

test("event map links prefer saved URLs and otherwise include venue and address", () => {
  const exact = "https://maps.google.com/?cid=123";
  assert.equal(eventGoogleMapsUrl({ ...baseEvent, googleMapsUrl: exact }), exact);
  const fallback = eventGoogleMapsUrl({
    ...baseEvent,
    address: "Unit 3/76 Ferry Rd, Southport QLD 4215",
    suburb: "Southport",
    venueName: "Gold Coast Salsa",
  });
  assert.match(decodeURIComponent(fallback), /Gold Coast Salsa/);
  assert.match(decodeURIComponent(fallback), /Unit 3\/76 Ferry Rd/);
});

test("admin validation rejects invalid URLs and dates", () => {
  const invalid = validateEventInput({ ...baseEvent, bookingUrl: "http://example.com", startAt: "tomorrow" });
  assert.ok(invalid.errors.some((error) => error.includes("https")));
  assert.ok(invalid.errors.some((error) => error.includes("startAt")));
});

test("events can be published with a date to be confirmed", () => {
  const result = validateEventInput({ ...baseEvent, dateStatus: "tbc", startAt: null });
  assert.equal(result.event.dateStatus, "tbc");
  assert.equal(result.event.startAt, null);
});

test("event descriptions are optional", () => {
  const result = validateEventInput({ ...baseEvent, shortDescription: "" });
  assert.equal(result.errors, undefined);
  assert.equal(result.event.shortDescription, "");
});

test("SQL injection-like text remains plain event data", () => {
  const title = "Class'); DROP TABLE events; --";
  const result = validateEventInput({ ...baseEvent, title });
  assert.equal(result.event.title, title);
});

test("unauthenticated admin requests are rejected", async () => {
  const result = await verifyAccessRequest({
    request: new Request("https://example.com/api/admin/events"),
    env: {
      ACCESS_TEAM_DOMAIN: "https://example.cloudflareaccess.com",
      ACCESS_AUD: "audience",
      ADMIN_EMAILS: "shemotion.au@gmail.com",
    },
  });
  assert.equal(result.response.status, 401);
});

test("public API uses future published filtering and ordered results", async () => {
  let sql = "";
  const futureStartAt = new Date(Date.now() + 7 * 86400000).toISOString();
  const row = {
    id: 1, title: baseEvent.title, event_type: baseEvent.eventType, venue_name: baseEvent.venueName,
    suburb: baseEvent.suburb, address: "1 Example Street, Helensvale QLD 4212", date_status: baseEvent.dateStatus,
    start_at: futureStartAt, end_at: null, timezone: baseEvent.timezone,
    audience: baseEvent.audience, short_description: baseEvent.shortDescription,
    booking_label: baseEvent.bookingLabel, booking_url: null, availability_status: baseEvent.availabilityStatus,
    google_maps_url: "https://maps.google.com/?cid=123", latitude: -27.9, longitude: 153.3,
  };
  const env = {
    DB: {
      prepare(query) {
        sql = query;
        return {
          all: async () => ({ results: [row] }),
        };
      },
    },
  };
  const response = await getPublicEvents({ env });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.events.length, 1);
  assert.equal(body.events[0].address, row.address);
  assert.equal(body.events[0].googleMapsUrl, row.google_maps_url);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(sql, /address/);
  assert.match(sql, /is_published = 1/);
  assert.match(sql, /start_at ASC/);
  assert.doesNotMatch(sql, /start_at >=|end_at >=/);
});

test("published event slugs render crawlable metadata and database-backed Event JSON-LD", async () => {
  const row = {
    id: 8, slug: "release-and-reconnect-tallai", title: "Release & Reconnect",
    event_type: "Workshop", venue_name: "Example Venue", suburb: "Tallai",
    address: "1 Example Road, Tallai QLD 4213", date_status: "scheduled",
    start_at: "2026-10-20T08:00:00.000Z", end_at: "2026-10-20T10:00:00.000Z",
    timezone: "Australia/Brisbane", audience: "Women only",
    short_description: "A guided feminine movement meditation experience.", booking_label: "Book now",
    booking_url: "https://events.example.com/release", availability_status: "Available",
    recurrence_frequency: "none", recurrence_until: null, display_order: 0, location_id: 2,
    latitude: -28.0, longitude: 153.3, google_maps_url: "https://maps.google.com/?cid=123",
    updated_at: "2026-09-14 02:00:00",
  };
  const env = { DB: { prepare: () => ({ bind: () => ({ first: async () => row }) }) } };
  const response = await getEventPage({ env, params: { slug: row.slug } });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /<title>Shemotion: Release &amp; Reconnect - Tallai \| Gold Coast Women&#39;s Event<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/shemotion\.com\.au\/events\/release-and-reconnect-tallai\/">/);
  assert.match(html, /A guided feminine movement meditation experience\./);
  const json = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
  assert.equal(json.name, row.title);
  assert.equal(json.startDate, row.start_at);
  assert.equal(json.location.name, row.venue_name);
  assert.equal(json.offers.url, row.booking_url);
  assert.equal(Object.hasOwn(json.offers, "price"), false);
});

test("unpublished or invalid event slugs return a noindex 404", async () => {
  const env = { DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) } };
  const response = await getEventPage({ env, params: { slug: "private-draft" } });
  const html = await response.text();
  assert.equal(response.status, 404);
  assert.match(html, /<meta name="robots" content="noindex">/);
});

test("sitemap retains published historical URLs and excludes non-public routes", async () => {
  let sql = "";
  const env = { DB: { prepare: (query) => { sql = query; return { all: async () => ({ results: [{ slug: "public-event", updated_at: "2026-09-14 02:00:00" }] }) }; } } };
  const response = await getSitemap({ env });
  const xml = await response.text();
  assert.match(sql, /is_published = 1/);
  assert.match(xml, /https:\/\/shemotion\.com\.au\/events\/public-event\//);
  assert.match(xml, /private-groups-retreats/);
  assert.match(xml, /what-is-feminine-movement-meditation/);
  assert.doesNotMatch(xml, /admin|api\/events/);
});

test("Event JSON-LD is omitted for TBC events and never invents price data", () => {
  assert.equal(eventJsonLd({ ...baseEvent, dateStatus: "tbc", startAt: null }, "https://shemotion.com.au/events/example/"), null);
  const schema = eventJsonLd({ ...baseEvent, address: "1 Example Road", bookingUrl: null }, "https://shemotion.com.au/events/example/");
  assert.equal(Object.hasOwn(schema, "offers"), false);
});

test("calendar utilities use Brisbane dates and Monday-first months", () => {
  assert.equal(eventDateKey("2026-08-18T23:15:00.000Z"), "2026-08-19");
  const days = monthGrid(2026, 7);
  assert.equal(days.length, 42);
  assert.equal(days[0].key, "2026-07-27");
  assert.deepEqual(moveMonth({ year: 2026, month: 11 }, 1), { year: 2027, month: 0 });
});

test("weekly recurring events expand into dated occurrences", () => {
  const recurring = { ...baseEvent, recurrenceFrequency: "weekly", recurrenceUntil: "2026-09-02" };
  const occurrences = expandRecurringEvents(
    [recurring],
    "2026-08-18T00:00:00.000Z",
    "2026-09-03T00:00:00.000Z"
  );
  assert.equal(occurrences.length, 3);
  assert.ok(occurrences.every((event) => event.seriesId === baseEvent.id));
});

test("recurrence validation rejects an end before the first event", () => {
  const result = validateEventInput({
    ...baseEvent,
    recurrenceFrequency: "weekly",
    recurrenceUntil: "2026-08-01",
  });
  assert.ok(result.errors.some((error) => error.includes("on or after")));
});

test("saved locations require reusable venue details", () => {
  const invalid = validateLocationInput({ name: "Stellar Studio Collective", address: "" });
  assert.ok(invalid.errors.some((error) => error.includes("address")));
  const valid = validateLocationInput({
    name: " Stellar Studio Collective ",
    suburb: " Helensvale ",
    address: " Unit 11/5 Philip Gray Rd, Helensvale QLD 4212 ",
  });
  assert.deepEqual(valid.location, {
    name: "Stellar Studio Collective",
    suburb: "Helensvale",
    address: "Unit 11/5 Philip Gray Rd, Helensvale QLD 4212",
    latitude: null,
    longitude: null,
    googleMapsUrl: null,
  });
});

test("saved location rows retain optional map coordinates", () => {
  assert.deepEqual(rowToLocation({
    id: 3, name: "Stellar", suburb: "Helensvale", address: "1 Example Road",
    latitude: -27.9, longitude: 153.3, google_maps_url: "https://maps.google.com/?cid=123",
  }), {
    id: 3, name: "Stellar", suburb: "Helensvale", address: "1 Example Road",
    latitude: -27.9, longitude: 153.3, googleMapsUrl: "https://maps.google.com/?cid=123",
  });
});

test("saved location validation accepts coordinate pairs and rejects unsafe map URLs", () => {
  const valid = validateLocationInput({
    name: "Gold Coast Salsa", suburb: "Southport",
    address: "Unit 3/76 Ferry Rd, Southport QLD 4215",
    latitude: -27.98, longitude: 153.41,
    googleMapsUrl: "https://maps.google.com/?cid=123",
  });
  assert.equal(valid.errors, undefined);
  const invalid = validateLocationInput({
    name: "Gold Coast Salsa", address: "Unit 3/76 Ferry Rd",
    latitude: -27.98, googleMapsUrl: "https://example.com/not-maps",
  });
  assert.ok(invalid.errors.some((error) => error.includes("together")));
  assert.ok(invalid.errors.some((error) => error.includes("Google Maps")));
  const swapped = validateLocationInput({
    name: "Gold Coast Salsa",
    address: "https://maps.app.goo.gl/JZVGXLXR2BVrph598",
  });
  assert.ok(swapped.errors.some((error) => error.includes("street address")));
});

test("admin can create and update complete saved location geography", async () => {
  const savedRow = {
    id: 4, name: "Gold Coast Salsa", suburb: "Southport",
    address: "Unit 3/76 Ferry Rd, Southport QLD 4215",
    latitude: -27.97, longitude: 153.41,
    google_maps_url: "https://maps.google.com/?cid=123",
  };
  const statements = [];
  const env = {
    DB: {
      prepare(sql) {
        const statement = { sql, values: [] };
        statements.push(statement);
        return {
          bind(...values) {
            statement.values = values;
            return {
              first: async () => sql.includes("SELECT") ? null : savedRow,
            };
          },
        };
      },
    },
  };
  const payload = {
    name: savedRow.name, suburb: savedRow.suburb, address: savedRow.address,
    latitude: savedRow.latitude, longitude: savedRow.longitude,
    googleMapsUrl: savedRow.google_maps_url,
  };
  const created = await createLocation({
    env,
    request: new Request("https://example.com", { method: "POST", body: JSON.stringify(payload) }),
  });
  assert.equal(created.status, 201);
  assert.equal((await created.json()).location.googleMapsUrl, savedRow.google_maps_url);
  assert.match(statements.at(-1).sql, /google_maps_url/);

  const updated = await updateLocation({
    env, params: { id: "4" },
    request: new Request("https://example.com/4", { method: "PUT", body: JSON.stringify(payload) }),
  });
  assert.equal(updated.status, 200);
  assert.deepEqual(statements.at(-1).values.slice(3, 6), [savedRow.latitude, savedRow.longitude, savedRow.google_maps_url]);
});

test("Google place data populates a saved location only after selection", () => {
  assert.deepEqual(placePredictionSummary({ placePrediction: {
    placeId: "abc", text: { text: "Stellar Studio Collective" },
    structuredFormat: { mainText: { text: "Stellar Studio Collective" }, secondaryText: { text: "Helensvale QLD" } },
  } }), { id: "abc", name: "Stellar Studio Collective", address: "Helensvale QLD" });
  assert.deepEqual(placeDetailsToLocation({
    displayName: { text: "Stellar Studio Collective" },
    formattedAddress: "Unit 11/5 Philip Gray Rd, Helensvale QLD 4212, Australia",
    addressComponents: [{ longText: "Helensvale", types: ["locality"] }],
    location: { latitude: -27.9, longitude: 153.3 },
    googleMapsUri: "https://maps.google.com/?cid=123",
  }), {
    name: "Stellar Studio Collective", suburb: "Helensvale",
    address: "Unit 11/5 Philip Gray Rd, Helensvale QLD 4212, Australia",
    latitude: -27.9, longitude: 153.3, googleMapsUrl: "https://maps.google.com/?cid=123",
  });
});
