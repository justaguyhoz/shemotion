# D1 and event architecture review — 16 September 2026

## Decision

Keep production event processing unchanged. The actual database is small and the measured queries and transformations do not demonstrate a practical bottleneck. Add reproducible benchmark fixtures and regression coverage instead of speculative optimization. No visual, copy, conversion, runtime, schema, data, dependency or framework changes.

Baseline: `984e25c930bd04e4eec5ae795a7a66dc7a70fd2a`, clean local main matching remote main. Baseline tests: 45 passed; build passed. D1 was inspected using SELECT and EXPLAIN only; all operations reported zero rows written.

## 1. Current data path

| Consumer | Database and processing | Freshness |
| --- | --- | --- |
| Homepage | Static document; script.js fetches `api/events?fresh=<timestamp>` once during initialization with fetch cache `no-store`; API calls getUpcomingPublicEvents; browser creates one card per returned occurrence and initializes Quick Details/carousel. | API success/error responses are no-store. No polling or push updates. |
| `/api/events` | One joined SELECT of published events and saved locations; SQL orders TBC last, start_at, display_order. rowToPublicEvent normalizes every row, then expandRecurringEvents applies a now-to-now+366-day window and sorts again. All retained occurrences returned. | One new D1 query per request; no application cache. |
| `/events/` | Same shared query and expansion. Then keeps the first sorted occurrence for each nonempty slug and renders cards. | Successful HTML is no-store. Existing error HTML uses the default 300-second cache header. |
| `/events/:slug/` | One published-slug lookup joined to locations, limit 1. One-offs use the stored record directly. Recurring records expand the upcoming year and select the first result; if none, expand from series start through now and use the last historical result. | Successful detail HTML is no-store. Existing missing-event HTML uses the default 300-second header. |
| Sitemap | Separate SELECT of published, nonempty slugs and updated_at, ordered by slug. No join, recurrence or lifecycle filtering. Includes published historical URLs plus four static URLs. | Existing public max-age=3600; no write-triggered invalidation. |
| Admin | Authenticated events GET selects all event rows, including unpublished/past records, with location join and the same SQL ordering. Separate locations GET sorts reusable locations by name. Browser normalizes via server response and keeps arrays in memory. | No explicit cache-control on these JSON handlers and no application response cache. Client uses default fetch caching. Event saves/deletes call loadData to fetch events and locations again. Location saves update the local location array. |
| Admin calendar | renderEvents also renders the calendar; choosing Calendar or changing month renders again. Each render expands all loaded events for its 42-day grid, groups by Brisbane date, discards TBC from date grouping, and creates day controls. | Uses loaded browser state; calendar navigation does not query D1. |

The public query selects display/booking/lifecycle/recurrence/location fields, not whole tables. Saved location name/suburb/address override legacy event fields using COALESCE. Slug details additionally select updated_at. Sitemap avoids loading event descriptions and location data.

### Recurrence and lifecycle order

1. Publication is filtered in public SQL; cancellation is not filtered out. Admin loads both publication states.
2. TBC or missing-start records pass through expansion before date checks.
3. One-offs are retained unless past and only when start <= range end.
4. Recurring records start at their original start. Each step allocates a copied occurrence with a timestamp-based ID and original series ID, then tests whether it is past. It stops at range end, recurrence end, or 520 iterations.
5. An explicit end grants one hour of grace; otherwise start grants three hours. The exact grace threshold is past (`now >= threshold`). Multi-day duration is retained for every occurrence.
6. Weekly/fortnightly add 7/14 UTC days. Monthly operates at fixed Brisbane UTC+10, skips months without the same day, and does not clamp to month-end. recurrence_until ends at Brisbane 23:59:59.999. The timezone field does not change this fixed Brisbane recurrence arithmetic.
7. Retained output sorts scheduled entries by start then display order, with TBC after them. Existing tie/TBC comparator behaviour is preserved.

No cross-request sharing exists: visiting homepage then listing executes the same public query/expansion twice, once per request. This is not duplicate execution within one API request. A recurring detail can expand twice when its series has ended. The listing expands all occurrences before deduplicating to one per slug.

## 2. Actual D1 schema and query measurements

Production contains **9 events, 7 published, 0 recurring, 0 TBC**. Five published events are upcoming; two are historical. Event and location keys are integer primary keys. Existing indexes:

- idx_events_public: (is_published, date_status, start_at, display_order).
- idx_events_slug: unique (slug).
- idx_events_location: (location_id).
- idx_locations_identity: unique (name, address).

Exact application SELECTs were executed read-only remotely, with their EXPLAIN plans. These are individual observations, not percentile latency measurements; D1 SQL time excludes browser/network/rendering overhead. D1 rows_read counts database work and must not be confused with returned event records.

| Query | Returned rows | D1 rows_read | SQL time (ms) | Plan |
| --- | ---: | ---: | ---: | --- |
| Public joined list | 7 | 21 | 0.4980 | idx_events_public on publication; locations primary-key join; temporary B-tree for ORDER BY |
| Published slug detail | 1 | 2 | 0.1862 | unique idx_events_slug; locations primary-key join |
| Sitemap | 7 | 14 | 0.1313 | idx_events_public on publication; temporary B-tree for ORDER BY slug |

The CASE expression in public ORDER BY prevents that ordering from being completely satisfied by the existing index. A new expression/covering index could remove sorting but would add storage and maintenance on event writes to avoid sorting seven rows. Likewise, a publication/slug sitemap index would avoid a tiny sort while duplicating existing index coverage. **Neither is justified. No index or migration added.** Admin intentionally reads all events; location-name sorting is similarly tiny.

The actual seven public records generate **zero recurrence occurrence objects**, retain five records, discard two historical inputs, and produce five listing cards. Local recurrence/filter/sort work averaged **0.0172 ms** over 10,000 calls after warmup. This is local Node CPU, not Cloudflare request latency.

## 3. Representative benchmark

Run `node benchmark/events.mjs` (no dependencies, network or database writes). Fixtures use a fixed clock of 2026-09-16T00:00:00Z and include future/past one-offs, weekly/fortnightly/monthly series, a 2020 weekly series, a 2010 series, expired recurrence, cancellation, unpublished state, TBC, exact grace boundaries, multi-day events and year boundaries. Sixteen input records include one unpublished record; the public benchmark applies the SQL-equivalent publication filter before expansion (15 inputs). It does not claim synthetic D1 read counts.

Occurrence allocation counts come from an input Proxy enumeration counter at object spread; production code is not instrumented. Timings run on plain inputs separately: 50 warmup calls, 15 batches of 50 calls; median batch mean. Node v26.5.0. Counts are the useful stable comparison; CPU results vary by machine.

| Case | Inputs | Generated occurrences | Retained output (recurring) | Discarded occurrences | First run ms | Final repeat ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Representative public year | 15 | 1,017 | 120 (115) | 902 | 3.8445 | 3.8744 |
| Admin six-week window | 16 | 909 | 21 (13) | 896 | 3.4805 | 3.4337 |
| 2020 weekly series, public year | 1 | 403 | 53 (53) | 350 | 1.5406 | 1.5538 |
| 2010 weekly series, public year | 1 | 520 | 0 | 520 | 1.9808 | 1.9329 |
| Expired monthly detail: upcoming search | 1 | 24 | 0 | 24 | 0.0979 | 0.1000 |
| Same detail: historical fallback | 1 | 24 | 24 (24) | 0 | 0.1068 | 0.1112 |

The mixed public listing retains nine unique slugs from 120 expanded outputs, discarding 111 outputs during deduplication. Homepage and listing requested separately generate 2,034 occurrences in this synthetic case. The long weekly detail needs only the first of 53 retained results. The expired detail generates 48 occurrences across its two calls and finally uses one historical result. Admin drops TBC from date grouping after expansion.

**Before/after:** production code and queries are identical; all object/row counts are unchanged. Timing differences above are repeat-run noise, not improvements. No performance improvement is claimed.

## 4. Bottlenecks and deliberately rejected changes

There is measurable historical allocation and unnecessary listing/detail expansion in recurrence-heavy fixtures. There is no demonstrated production recurrence bottleneck because no current records recur. The mixed fixture costs about 4 ms locally, and a realistic single older weekly series costs about 1.5 ms.

- No earlier SQL date filter: a simple start_at >= now would drop grace-period records, ongoing multi-day events and old recurring series. A more complex predicate saves just two current rows and adds lifecycle duplication.
- No recurrence fast-forward/window algorithm: care is required around duration/grace, skipped monthly dates, Brisbane boundaries and the existing 520 limit. Small practical gain does not justify the correctness risk today.
- No first-occurrence-only listing/detail API: potential future benefit, but it introduces a second expansion mode to maintain for no current recurrence workload.
- No sort removal: SQL and JavaScript ordering are not identical for every tie/TBC case; removing one could change stable selection in the listing.
- No speculative shared cache, new indexes or schema migrations.

### Existing old-series constraint

A 2010 weekly fixture stops after 520 occurrences before it reaches the requested 2026 window, returning none. This is existing observable behaviour, not a new regression. Changing the cap or jumping beyond it would make previously absent events appear and may change historical detail fallback. Treat a correction as a separate, moderate-risk semantics decision with differential coverage, not a transparent optimization. No current production series is affected.

## 5. Cache/freshness and back navigation

**No new event cache is justified.** Existing request-time freshness takes priority over saving sub-millisecond database work.

| Data | Existing/retained policy | Required implications |
| --- | --- | --- |
| Event API and successful listing/detail | No-store; no introduced TTL | The next request must see cancellation, publication/unpublication, edited dates/details and booking URL/availability changes. Already-open pages have no live invalidation and are not guaranteed to change immediately. |
| Sitemap | Existing public one-hour TTL retained | Published edits/unpublication may remain in a cached sitemap until expiry. Detail requests still enforce publication. No additional stale window introduced. |
| Admin | Existing loaded in-memory state and post-save/delete reload | No shared cache introduced for authenticated data; response-header hardening was not mixed into this performance pass. |
| Static assets | Existing behaviour | Not part of this event-data pass. |

script.js deliberately reloads the whole homepage on pageshow only when event.persisted is true. This replaces a BFCache snapshot and runs one fresh event fetch on reinitialization; a normal new document also performs one fetch. The timestamp parameter is redundant with no-store in normal HTTP caching, but removing it offers no measured practical benefit here. public-page.js has no equivalent persisted-page reload, so listing/detail BFCache behaviour remains browser-dependent and must not be described as guaranteed immediate invalidation.

Replacing the full homepage reload with a partial refresh could preserve UI state and avoid other initialization work, but changes visible restoration/interaction behaviour, tracking initialization and failure handling. A live back-navigation check returned a populated homepage with usable Quick Details. Browser automation did not expose navigation timing/BFCache instrumentation, so no measured BFCache hit rate, reload-byte reduction or timing improvement is claimed. Keep this behaviour unchanged in a behaviour-preserving pass.

Any future cache proposal must define invalidation for both event and saved-location edits, cancellation, publishing, booking state, lifecycle expiry and sitemap independently. A TTL alone cannot guarantee immediate next-request freshness.

## 6. Validation and changes

Files added:

- benchmark/event-fixtures.js: reusable fixed-clock representative events and allocation counter.
- benchmark/events.mjs: reproducible recurrence work and local CPU measurements.
- test/recurrence-boundaries.test.js: eight additional boundary tests.
- docs/event-architecture-review.md: findings and decisions.

Complete tests: **53 passed, zero failed** (45 existing plus eight new). Production build and git diff --check passed. New tests protect monthly missing days/leap years, Brisbane cutoff/year transitions, exact grace boundaries, inclusive requested range end, multi-day recurring duration, long weekly series dates/IDs, TBC/cancelled JSON-LD and stable display ordering/input immutability. Existing tests continue to protect publication filtering, unpublished 404, admin validation/authentication, saved locations, booking tracking and sitemap inclusion. No wall-clock assertions added.

Production-equivalent validation used actual read-only published D1 rows with the local Function handlers. Live API objects, listing HTML, all seven published detail HTML responses and sitemap XML matched local outputs exactly. All seven details returned 200 with correct canonical URLs and JSON-LD; the two past records suppress booking and retain ended messaging. Five upcoming records retain booking destinations, including exact WellnessLiving and Tallai Eventbrite URLs. A missing slug returns 404. Sitemap retains seven published event URLs plus four static URLs. External booking checkout was not submitted.

Manual browser checks covered live homepage loading, Quick Details address/maps/description, detail navigation and returning home. The unchanged built admin calendar was checked against read-only local fixtures: month navigation, event selection and editing form with saved location and Tallai booking URL. No production admin save or data mutation occurred. This is not an end-to-end production admin write test.

## 7. Risk and completion

**Implemented work: low risk, tests/benchmarks/documentation only.** Application source and build inputs remain unchanged from the supplied baseline. No D1 migration or production write was performed. Commit/push and deployment identifiers are recorded in the task completion report; any deployment contains the same runtime code and assets.

Deferred only if future evidence warrants it: recurrence window seeking/first-occurrence selection when recurring usage becomes material; a separately approved decision on the old-series cap; instrumented cross-browser BFCache work before replacing full reload; cache/index reconsideration if measured traffic or row volume grows. No further pass was started.
