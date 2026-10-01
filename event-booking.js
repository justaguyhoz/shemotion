export const BOOKING_STATE_OPTIONS = [
  "Booking open",
  "Limited spaces",
  "Coming soon",
  "Sold out",
  "No booking required",
  "Cancelled",
];

export function eventBookingState(event) {
  const stored = String(event?.availabilityStatus || "").trim();
  if (stored === "Cancelled") return "cancelled";
  if (stored === "Sold out") return "sold_out";
  if (stored === "No booking required") return "not_required";
  if (stored === "Coming soon") return "coming_soon";
  if (stored === "Limited spaces") return event?.bookingUrl ? "open" : "coming_soon";
  if (stored === "Booking open") return "open";
  if (stored === "Available") return event?.bookingUrl ? "open" : "coming_soon";
  return event?.bookingUrl ? "open" : "coming_soon";
}

export function eventBookingPresentation(event) {
  const state = eventBookingState(event);
  if (state === "cancelled") return { state, statusLabel: "Cancelled", action: null };
  if (state === "coming_soon") return { state, statusLabel: "Coming Soon", action: null };
  if (state === "not_required") return { state, statusLabel: "No Booking Required", action: null };
  if (state === "sold_out") {
    const savedLabel = event.bookingLabel?.trim();
    return {
      state,
      statusLabel: "Sold Out",
      action: event.bookingUrl
        ? { href: event.bookingUrl, label: !savedLabel || /^book\s*now$/i.test(savedLabel) ? "Join Waitlist" : savedLabel }
        : null,
    };
  }
  return {
    state: "open",
    statusLabel: event.availabilityStatus === "Limited spaces" ? "Limited Spaces" : null,
    action: event.bookingUrl
      ? { href: event.bookingUrl, label: event.bookingLabel?.trim() || "Book Now" }
      : null,
  };
}

export function eventImageUrl(event) {
  const value = String(event?.imageUrl || "").trim();
  return value || null;
}
