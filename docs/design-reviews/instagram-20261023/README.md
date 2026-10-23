# Instagram and postponed events — 23 October 2026

Branch: `codex/instagram-postponed-events`. Production baseline: `017ea95ef503763f549fb91abf0dd11d626002c7`.

The homepage gallery now uses nine individual covers and exact real post links from the public @shemotion.au profile, including its podcast collaboration. The scrolling, keyboard/touch interaction, pause control and reduced-motion behaviour are preserved.

New **Admin → Instagram** supports thumbnail uploads, post links, ordering and saved gallery updates without deployment. Uploads are compressed to lightweight WebP. Optional official-API refresh and visitor-triggered daily background checks are implemented with last-good-gallery fallback, private credentials, account verification, a concurrency lease and authenticated admin routes. **Automatic refresh remains off until the account owner authorises official Instagram API access.** See [setup and operation](../../instagram-gallery.md).

Events now support **Postponed** independently of Cancelled. Published postponed events retain their canonical HTTP 200 page and sitemap URL, hide booking actions and the previous time, display a new-date notice and use `EventPostponed` with the original start date. They do not appear as bookable upcoming events. The original flyer is labelled as outdated. Afterglow event 11 is intended to change from Cancelled to Postponed after code deployment, keeping its original slug, publication and schedule.

## Validation

- 134 individual tests pass with `npm test -- --test-isolation=none`; `npm run build` and `git diff --check` pass.
- Local admin image upload/save, persisted homepage update and restoration of the gallery verified through the actual Pages runtime.
- Homepage and Instagram admin checked at 320, 375, 390, 430, 768, 1024 and 1440px; no horizontal overflow or browser JavaScript errors. Real covers loaded, reduced-motion behaviour and pause control verified.
- Postponed event checked at 320, 375, 390, 430, 768 and 1440px: HTTP 200, matching canonical, no noindex, retained sitemap entry, original structured-data date, EventPostponed, no offers or booking button, and exclusion from upcoming API results.
- Official Meta authentication and live automated sync cannot be verified without authorised account credentials; mocked upstream success, wrong-account, bad-image, empty-result, failure fallback, daily timing, concurrency and background-refresh cases pass.
- No database migration, contact integration, analytics configuration or admin-access-policy change.

## Screenshots

- [Instagram desktop](instagram-1440.jpg) · [Instagram mobile](instagram-375.jpg)
- [Instagram admin desktop](admin-instagram-1440.jpg) · [Instagram admin mobile](admin-instagram-375.jpg)
- [Postponed event desktop](postponed-event-1440.jpg) · [Postponed event mobile](postponed-event-375.jpg)
- [Responsive and browser check results](results.json)

Screenshots are from the local Pages runtime with real-account cover assets. The postponed event uses a local fixture; production is updated only after the code is verified in Preview.

For rollback, first restore Afterglow's status to **Cancelled**, then roll back Pages to `db2617d4-9d9c-4921-8cf6-25fdd74381df`. Older code does not understand Postponed and could otherwise interpret a retained booking URL as active. Gallery files and stored overrides are independent of event records.
