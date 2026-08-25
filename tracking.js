function browserWindow() {
  return typeof window === "undefined" ? undefined : window;
}

export function trackCustomEvent(eventName, parameters = {}, target = browserWindow()) {
  try {
    if (typeof target?.fbq !== "function") return false;
    target.fbq("trackCustom", eventName, parameters);
    return true;
  } catch {
    return false;
  }
}

export function eventBookingMetadata(event) {
  const metadata = {
    event_id: event.id == null ? undefined : String(event.id),
    event_name: event.title || undefined,
    event_type: event.eventType || undefined,
    venue_name: event.venueName || undefined,
    suburb: event.suburb || undefined,
  };
  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined));
}

export function addCustomEventClickTracking(element, eventName, parameters = {}, target = browserWindow()) {
  if (!element?.addEventListener) return;
  element.addEventListener("click", () => {
    const eventParameters = typeof parameters === "function" ? parameters() : parameters;
    trackCustomEvent(eventName, eventParameters, target);
  });
}
