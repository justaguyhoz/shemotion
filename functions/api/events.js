import { jsonResponse } from "../../shared/events.js";
import { getUpcomingPublicEvents } from "../../shared/event-store.js";

export async function onRequestGet({ env }) {
  try {
    const events = await getUpcomingPublicEvents(env.DB);

    return jsonResponse(
      { events },
      200,
      { "cache-control": "no-store" }
    );
  } catch {
    return jsonResponse({ error: "Upcoming events are temporarily unavailable." }, 500, {
      "cache-control": "no-store",
    });
  }
}
