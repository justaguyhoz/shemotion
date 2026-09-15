import { isEventPast } from "../event-lifecycle.js";

const SITE_URL = "https://shemotion.com.au";
const EMAIL = "shemotion.au@gmail.com";

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function metaPixel() {
  return `<!-- Meta Pixel Code -->
    <script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','4344672809106563');fbq('track','PageView');</script>
    <!-- End Meta Pixel Code -->`;
}

function socialLinks(className) {
  return `<div class="social-links ${className}" aria-label="Shemotion social media links">
    <a class="social-link" href="https://www.facebook.com/profile.php?id=61590301600564" target="_blank" rel="noopener noreferrer" aria-label="Shemotion on Facebook"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14.2 8.1h2.4V4.3c-.4-.1-1.8-.2-3.4-.2-3.4 0-5.7 2.1-5.7 6v3.4H3.8v4.2h3.7V24h4.5v-6.3h3.7l.6-4.2H12v-3c0-1.2.3-2.4 2.2-2.4Z"/></svg></a>
    <a class="social-link" href="https://www.instagram.com/shemotion.au/" target="_blank" rel="noopener noreferrer" aria-label="Shemotion on Instagram"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7.3 2h9.4A5.3 5.3 0 0 1 22 7.3v9.4a5.3 5.3 0 0 1-5.3 5.3H7.3A5.3 5.3 0 0 1 2 16.7V7.3A5.3 5.3 0 0 1 7.3 2Zm0 2.1a3.2 3.2 0 0 0-3.2 3.2v9.4a3.2 3.2 0 0 0 3.2 3.2h9.4a3.2 3.2 0 0 0 3.2-3.2V7.3a3.2 3.2 0 0 0-3.2-3.2H7.3Zm4.7 3.4A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 2.1a2.4 2.4 0 1 0 2.4 2.4A2.4 2.4 0 0 0 12 9.6Zm5-2.5a1.1 1.1 0 1 1-1.1 1.1A1.1 1.1 0 0 1 17 7.1Z"/></svg></a>
  </div>`;
}

export function siteHeader() {
  return `<header class="site-header" data-header>
      <a class="brand" href="/" aria-label="Shemotion home"><img src="/assets/shemotion-logo.png" alt="Shemotion" width="1080" height="326"></a>
      <nav class="site-nav" id="site-nav" aria-label="Main navigation">
        <a href="/events/">Events</a><a href="/private-groups-retreats/">Private Groups</a><a href="/what-is-feminine-movement-meditation/">The Approach</a><a href="/#experience">Experience</a><a href="/#coach">Meet Katty</a>${socialLinks("nav-social-links")}
      </nav>
      <div class="header-actions"><a class="header-cta" href="/#contact">Contact Shemotion</a>${socialLinks("header-social-links")}<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span></span><span></span><span></span><span class="sr-only">Menu</span></button></div>
    </header>`;
}

export function siteFooter() {
  return `<footer class="site-footer">
      <a class="brand" href="/" aria-label="Shemotion home"><img src="/assets/shemotion-logo.png" alt="Shemotion" width="1080" height="326"></a>
      <div class="footer-copy"><p>Feminine embodiment, movement and release</p><p>All rights reserved Shemotion.</p><p><a href="/events/">Events</a> &middot; <a href="/private-groups-retreats/">Private Groups &amp; Retreats</a></p>${socialLinks("footer-social-links")}</div>
    </footer>`;
}

export function pageDocument({ title, description, canonical, body, bodyAttributes = "", structuredData = null, status = 200 }) {
  const image = `${SITE_URL}/assets/meditation.jpg`;
  const robots = status === 404 ? '<meta name="robots" content="noindex">' : "";
  const jsonLd = structuredData
    ? `<script type="application/ld+json">${JSON.stringify(structuredData).replaceAll("<", "\\u003c")}</script>`
    : "";
  return `<!doctype html><html lang="en"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}">${robots}
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <meta property="og:type" content="website"><meta property="og:site_name" content="Shemotion"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:image" content="${image}">
    <link rel="icon" href="/assets/favicon_shemotion.png" type="image/png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Marcellus&display=swap" rel="stylesheet"><script>document.documentElement.classList.add("reveal-ready")</script><link rel="stylesheet" href="/styles.css?v=20260915-4">
    ${jsonLd}${metaPixel()}</head><body ${bodyAttributes}>
    <noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=4344672809106563&amp;ev=PageView&amp;noscript=1" alt=""></noscript>
    ${siteHeader()}${body}${siteFooter()}<script type="module" src="/public-page.js?v=20260915-4"></script></body></html>`;
}

export function htmlResponse(document, status = 200, cacheControl = "public, max-age=300") {
  return new Response(document, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": cacheControl } });
}

export function formatEventDate(event) {
  if (event.dateStatus === "tbc" || !event.startAt) return "Date to be confirmed";
  return new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Brisbane" }).format(new Date(event.startAt));
}

export function formatEventTime(event) {
  if (!event.startAt) return "Time to be confirmed";
  const formatter = new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Brisbane" });
  return event.endAt ? `${formatter.format(new Date(event.startAt))} - ${formatter.format(new Date(event.endAt))}` : formatter.format(new Date(event.startAt));
}

export function eventDescription(event) {
  const stored = event.shortDescription?.trim();
  if (stored && stored !== "-") return stored;
  return `${event.title} is a Shemotion ${event.eventType.toLowerCase()}${event.suburb ? ` in ${event.suburb}` : " on the Gold Coast"}.`;
}

export function eventJsonLd(event, canonical, now = new Date()) {
  if (event.dateStatus !== "scheduled" || !event.startAt || !event.venueName || (!event.address && !event.suburb)) return null;
  const data = {
    "@context": "https://schema.org", "@type": "Event", name: event.title,
    description: eventDescription(event), startDate: event.startAt,
    eventStatus: event.availabilityStatus === "Cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: event.venueName, address: { "@type": "PostalAddress", ...(event.address ? { streetAddress: event.address } : {}), ...(event.suburb ? { addressLocality: event.suburb } : {}), addressRegion: "QLD", addressCountry: "AU" } },
    organizer: { "@type": "Organization", name: "Shemotion", url: SITE_URL }, url: canonical,
  };
  if (event.endAt) data.endDate = event.endAt;
  if (event.bookingUrl && event.availabilityStatus !== "Cancelled" && !isEventPast(event, now)) {
    data.offers = { "@type": "Offer", url: event.bookingUrl, availability: event.availabilityStatus === "Sold out" ? "https://schema.org/SoldOut" : "https://schema.org/InStock" };
  }
  return data;
}

export { EMAIL, SITE_URL };
