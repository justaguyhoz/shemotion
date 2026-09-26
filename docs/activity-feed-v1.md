# Shemotion Activity Feed v1

## Status and implementation gate

Prepared server-side source boundary; not activated or configured. No production
source was read or changed. NOA ingestion is not implemented. The exported
`onRequest` is code-locked to HTTP 404 regardless of environment secrets. Only
local tests call `processActivityFeed`. Unlocking requires separate release approval.

The baseline Apps Script tracker projection has **no immutable row ID**. Persistent
UUIDs are approved in principle, not yet approved for production assignment. The
local feed therefore defaults to `outreach.availability = unavailable`, error code
`stable_ids_required`, with null records and aggregates. This is not an empty
tracker. An explicit approval is required before adding persistent UUIDs to the
Sheet or deploying any bridge changes. There is no row-number, name, email, URL
or mutable-text-hash fallback.

The updated bridge supplies `activityId` from an optional literal `activity_id`
column and validates all returned IDs. With no header, legacy admin reporting
is unchanged. With a header, missing, malformed or duplicate IDs fail closed.
The local feed consumes these sanitized IDs successfully in tests. The live
Sheet/bridge has not been migrated/deployed. Full NOA ingestion readiness is blocked.

## Verified source architecture

- Cloudflare Pages Functions, JavaScript modules, `DB` D1 binding.
- `enquiries` is authoritative for inbound enquiry facts. `contacts` and
  `contact_consents` are neither queried nor joined. Existing integer enquiry
  primary keys produce `shemotion:enquiry:<id>` identities.
- Outreach is a manually maintained Sheet through the private Apps Script
  `outreach_snapshot` command. The existing admin sanitizer is reused before a
  second, privacy-specific projection. Its original free-text whitelist is not
  sufficient as an external data boundary by itself.
- Existing admin middleware verifies Cloudflare Access user JWTs. It is not used
  for this route and has not been changed.
- The existing outreach bridge also searches notification Gmail messages. This
  route ignores those results completely; they are not enquiry or reply facts.
  No new Gmail access is introduced. A future tracker-only bridge read would
  remove this existing indirect dependency, subject to separate review.
- Opportunity Radar is a separate D1/repository and is not queried or modified.

## Endpoint and authorization

`GET /api/internal/activity-feed/v1`

Only a server consumer should call this route. It is network-addressable but
service-token protected, not a public/browser API. There is no CORS permission,
cookie auth, admin-JWT auth, query-secret auth or localhost authentication bypass.
Requests with an Origin header are rejected. All other methods return 405.

Required new Cloudflare secret: `SHEMOTION_ACTIVITY_FEED_TOKEN` (32-256 random
base64url characters). Optional rotation secret:
`SHEMOTION_ACTIVITY_FEED_PREVIOUS_TOKEN`. Store neither in Git nor browser code.
Send `Authorization: Bearer <service secret>` from a server-side secret store.
Missing configuration returns 503; missing/incorrect auth returns 401. Tokens
equal to existing contact/outreach bridge tokens are refused. Comparison hashes
both tokens with SHA-256 and compares fixed-size digests without an early exit;
JavaScript does not provide a formal constant-time execution guarantee.

Rotation: move the current secret to PREVIOUS, install a new random current
secret, update the authorized server consumer, verify use of the new secret,
then remove PREVIOUS promptly. Revoke a compromised previous secret immediately.
This credential authorizes this Shemotion read route only, not D1, admin writes,
Sheet writes, contact notifications or Opportunity Radar.

No new Cloudflare secrets or settings have been created. Existing bridge
configuration, only used after the ID gate: `CONTACT_WEBHOOK_URL` and the secret
`OUTREACH_DASHBOARD_TOKEN`. Keep the configuration flag
`SHEMOTION_ACTIVITY_OUTREACH_IDS_READY` unset until the approved immutable-ID
rollout is completed and verified. Setting it alone does not fix the bridge;
missing/malformed/duplicate UUIDs still fail closed.

No rate-limit binding exists in the reviewed repository. Configure a Cloudflare
edge rate limit for this path before enabling a consumer, and agree on bounded
polling. This draft does not invent a per-isolate limiter that would falsely
promise distributed protection. Check any account-level Access routing separately
before deployment; no production Cloudflare configuration was inspected.

## Envelope and period

`schemaVersion = shemotion.activity.v1`, `business = shemotion`, `generatedAt`,
`period { start, endExclusive }`, `availability`, and `sources { outreach, inbound }`.
No caller workspace, project or arbitrary source URL is accepted. The contract
below describes the tested core, not the release-locked HTTP entry point.

Optional `start=YYYY-MM-DD&end=YYYY-MM-DD` is a half-open UTC interval, maximum
90 days, with no future endpoint. Both parameters must be present together.
Default: the preceding 30 days through request time. All other or repeated query
parameters are rejected. Consumers should use explicit intervals for comparison.

Each source contains `availability`, bounded `records`, `aggregates`, `error`,
`latestActivityAt`, and `freshness`. Successful reads include `checkedAt`.
Unavailable sources have **null**, not empty, records and totals. A genuinely
empty successful read has an empty array and zero counts.

## BusinessActivity contract

Fields: `sourceId`, `subjectType`, `channel`, `priority`, `status`, `draftAt`,
`sentAt`, `followUpAt`, `responseAt`, `activityAt`, `responseState`,
`outcomeCategory`, `followUpState`, `stream`, `campaignRef`, `eventRef`,
`freshness`, `provenance`.

- Identity: `shemotion:outreach:<persisted activityId UUID>`. Renames, reordered
  rows, dates and status changes must not change identity. IDs must never be
  regenerated during sorting or reused for another outreach record.
- No subject label is emitted: a target can be a private person's name.
- Category, channel, priority, status, stream and outcomes use closed safe
  dictionaries. Unknown free text is not passed through or guessed.
- Status: drafted/sent/replied/won/lost/closed/no_response/unknown.
- A response date or explicit replied status establishes a recorded reply.
  Non-empty response/outcome notes do not establish a reply. Absence of response
  evidence means unknown, not proof of no reply.
- Follow-up is due today or overdue before today in Australia/Brisbane, excluding
  replied/closed records. A future follow-up date is not past activity evidence.
- `campaignRef` and `eventRef` remain null: no reliable bounded source fields
  currently exist. Website/coverage links are omitted rather than risk PII in URLs.
- The bridge may infer stream from text; stream provenance is explicitly
  `manual_or_inferred_not_attribution`, never causal attribution.

## InboundInquiryFact contract

Fields: `sourceId`, `enquiryType`, `submittedAt`, `sourceKind`, `sourcePlatform`,
`utmSource`, `utmMedium`, `campaignRef`, `eventRef`, `status`,
`notificationState`, `freshness`, `provenance`.

The SQL SELECT lists only necessary fields. It excludes contact ID, submission
UUID, names, addresses, phone numbers, raw messages, internal notes, consent,
source/referrer URLs, arbitrary UTM campaign/content/term, and notification bodies.

Enquiry types map the existing seven form choices to event_booking/private_group/
workplace/event_venue/media/partnership/other. Unknown manual categories map to
other. Status is new/reviewed/replied/closed/unknown. Notification state is
pending/sending/sent/failed/not_required/unknown, not evidence of a human reply.
`closed` does not mean responded. `sourceKind` distinguishes website_contact_form
and manual_admin_entry where recorded; other strings become unknown.

Source platform preserves only the D1 enum. UTM source/medium preserve a small
explicit dictionary; arbitrary attribution values are not exported. Raw UTM
campaign values may contain PII and are not trusted campaign references.
`campaignRef` and `eventRef` are null even if unreviewed fixture input contains
an event-like value. No event relationship is inferred from enquiry type or UTM.

## EvidenceProvenance and freshness

D1 submission facts are `direct_system_fact`; enquiry workflow state and Sheet
status are `manual_tracker_state`; follow-up calculations are
`derived_deterministic_state`. Stored source-platform classification is not
proof of marketing causation.

`generatedAt` is feed generation time. `checkedAt` is successful source-read time,
not content freshness. `sourceUpdatedAt` is D1's recorded update timestamp where
valid; for the Sheet it is unknown. Bridge `snapshotGeneratedAt` is not the
Sheet's last modification. Latest inquiry timestamp means latest returned
submission in the selected period, not an all-time watermark.

Record freshness uses the valid update/activity date: recent (at most seven
days), stale (older), unknown (absent/invalid/future). This describes age of
record evidence, not proof of failed source synchronization. Ambiguous Sheet
date strings are unavailable; ISO dates use Brisbane midnight, timestamp strings
require an explicit zone, and SQLite CURRENT_TIMESTAMP format is treated as UTC.
No current date is substituted for missing source dates.

## Aggregates, limits and errors

All counts are derived from emitted facts. Inbound is period-filtered, max 1,000
records, ordered by submission date and ID; a 1,001st row yields partial with
`record_limit`. Counts explicitly describe returned records, not unseen totals.

Outreach is a current-state snapshot, not an event log. The updated ID-aware
bridge refuses a grid at its 5,000-row read cap, because unseen rows could hide
duplicate IDs. When the ID header exists, a second read checks the entire raw
A:ZZ grid (maximum 2,097,152 JSON UTF-16 code units), detects ID formulas and validates
record identity/order against the formatted snapshot. Rows beyond the legacy
cap cannot silently hide duplicates. Concurrent reorders fail closed; these
two reads do not constitute a transactional snapshot of business-field edits.
The feed also treats a 5,000-row fixture as partial. Split/review
the source before reaching the limit; do not silently truncate identity checks.
Counters: contactedInPeriod (sent
date in period), repliedInPeriod (response date in period), repliedWithoutDate,
byStatus, followUpDue, overdue, highPriority, outcomes. Follow-ups/status/outcomes
describe current returned rows, not period events. High priority is not measured
conversion probability. Inbound counters: totalEnquiries, unactioned, responded,
byStatus, bySourcePlatform. Campaign/event breakdowns are unavailable, not zero.

Sources fail independently. One unavailable or capped source yields partial
(HTTP 200); both unavailable yields unavailable (503). Known error codes only:
stable_ids_required, record_limit, inbound_read_failed, outreach_read_failed.
No upstream error message, request body, URL, stack or credential is returned or
logged. Apps Script response reads have a 10-second abort and 2 MiB limit.
The D1 response wait is bounded to ten seconds; D1 does not expose cancellation
here, so an already-issued read may finish after that response deadline.
Malformed sources fail closed; a failed query never yields a zero count.

## Consumer expectations and non-goals

NOA must verify schemaVersion, map the fixed business to its own tenancy, keep
stable source IDs, show manual/derived evidence as such, respect unavailable and
partial states, and never infer record deletion from missing/capped snapshots.
Do not add aggregates to facts (double counting), confuse notifications with
responses, or report correlation as attribution. Do not cache this response
publicly; the feed is still private business information even without direct PII.

No NOA runtime/UI, write-back, contact editing, sending, follow-up automation,
AI attribution, raw Gmail access, admin redesign, migrations or production
configuration changes are included.

## Canonical checkout and preservation

The four original Activity Feed files were copied from the temporary audit clone
to `C:\Users\justa\Documents\Codex\2026-05-23\files-mentioned-by-the-user-meditation\live-shemotion`.
All four SHA-256 hashes matched before reconciliation. The canonical checkout was
clean, and HEAD plus fetched origin/main matched `29844ff`; no newer upstream
implementation was overwritten. The temporary originals remain intact.

## Sheet architecture and identity ownership

Repository source headers: Priority, Target, Category, Contact route, Website,
Pitch angle, Desired outcome, Status, Draft date, Sent date, Follow-up date,
Response / outcome, Coverage / backlink URL, Stream, Outcome Type, Response Date,
Last Activity Date. Headers are looked up by name, not fixed column positions.
Append `activity_id` as the rightmost used column, within A:ZZ. Do not rename or
shift business columns. IDs are literal text values, never formulas.

The bridge reads Sheets using its existing read-only OAuth scope. The admin
report only fetches snapshots. No repository path appends or edits tracker rows.
Actual human editors, importers, external scripts and triggers are not knowable
from repository code and MUST be inventoried before live rollout. Multiple
writers must share a reviewed assignment path; the public service never writes.

UUID generation uses Apps Script `Utilities.getUuid()`, documented as equivalent
to Java `UUID.randomUUID()`. It generates random version-4 UUIDs, not encoded
PII. The planner validates the RFC 4122 version/variant and collisions before any
write. Existing valid UUID bytes remain unchanged (including letter case);
case-insensitive duplicate checking and canonical lowercase feed IDs prevent
case-only duplicate identities.
Sources: [Google Utilities](https://developers.google.com/apps-script/reference/utilities/utilities#getUuid()),
[Java UUID](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/UUID.html#randomUUID()).

Rules:
- Initial existing blank IDs: explicitly reviewed backfill assigns once.
- Existing valid ID: retained across every field edit, sort and full-row move.
- Malformed ID, including whitespace/formulas: blocked; never auto-replaced.
- Duplicate ID: whole plan and identified bridge response blocked. Operator
  decides which row is original; no silent fix of either row.
- New record after rollout: explicit new-record assignment after a dry-run.
  No automatic onEdit trigger, scheduled assignment or read-time generation.
- Copied record: copy business fields WITHOUT `activity_id`. If already copied
  with its ID, confirm the original, clear only the new copy's ID explicitly,
  and approve new-record assignment. Copying a row is not automatically proof
  of a new business record.
- Deleted row: never recycle its ID. Generate a new UUID for new work. Archive
  business records instead of deleting where operational history is required.
- Erased ID on an existing record: restore from version history/backup; do not
  treat it as a new record. A Sheet alone cannot distinguish an erased ID from a
  new blank. Protect the ID column and restrict edits to the responsible owner.
- Sort/move entire rows, INCLUDING ID. Partial-column sorting breaks association
  and must be prohibited operationally; UUID validation cannot detect that error.

## Disposable Sheet rehearsal (manual, not performed live)

Local Node fixtures execute the real `.gs` code with a mocked Sheet, Properties,
LockService and Utilities. They are not a claim that Google Sheets was contacted.
No Google Sheet tool was used. Rehearse Google permissions and behavior manually:

1. Create a NEW blank Sheet named `[DISPOSABLE] Outreach IDs`; add tab `Tracker`.
   Use the headers above, plus activity_id. Do not copy production PII.
2. Add synthetic rows: two blank IDs, two distinct valid UUIDs, a blank row, a
   duplicated UUID and one malformed UUID. The local fixture source is
   `test/outreach-identity.test.js`; use its synthetic UUIDs, never real records.
3. In this Sheet only, open Extensions > Apps Script. Copy
   `outreach-identity.gs` and `test-tools/outreach-id-rehearsal.gs` into two script
   files. DO NOT copy the contact/Gmail bridge. Do not deploy the script.
4. Keep `@OnlyCurrentDoc`; set this bound test project's explicit OAuth scope to
   `https://www.googleapis.com/auth/spreadsheets.currentonly` in its manifest.
   Do not change the production bridge manifest or grant Gmail access.
5. Set test Script Properties: OUTREACH_ID_TEST_SPREADSHEET_ID = disposable ID,
   OUTREACH_ID_TEST_SHEET_NAME = Tracker, OUTREACH_ID_TEST_CONFIRM = DISPOSABLE_ONLY,
   and OUTREACH_SPREADSHEET_ID = the live ID solely as a deny-target guard. These
   IDs are configuration, not auth tokens. No live Sheet is opened by the runner.
6. Pause all collaborators/importers while applying; ScriptLock serializes this
   script's executions, not human edits or other script projects. Ensure a spare
   physical column exists if testing automatic rightmost header creation.
7. Run `dryRunTestOutreachIds`. Inspect counts and row-number-only errors in the
   execution log. It writes no Sheet cells and generates no UUIDs. A fingerprint
   of values/formulas is saved only in test Script Properties for stale-plan detection.
8. Confirm backfill refuses the duplicate/malformed fixture with ZERO writes.
   Remove only the invalid test fixtures, or deliberately correct them after
   review. Run dry-run again. Run `backfillTestOutreachIds`; only header/blank ID
   cells are written. Re-run: assigned = 0, all previous UUIDs preserved.
9. Edit/reorder full rows across all business fields. Dry-run reports unchanged
   valid IDs. Add a copied-ID row: dry-run blocks. Confirm it is a new record,
   clear only its copied ID, run dry-run, then set OUTREACH_ID_TEST_NEW_ROWS to a
   JSON array of the exact new Sheet row numbers (for example `[6]`). Run
   `assignNewTestOutreachIds`. These coordinates authorize reviewed writes;
   they do not become record identity. Later blank IDs cannot reuse initial backfill.
10. Verify a formula in the ID column is rejected even if it displays a UUID.
    Edits after dry-run require a new dry-run. Review audit results and retain
    the disposable Sheet as evidence. No web deployment or production secret setup.

Writes are cell-scoped and not transactional. A failure may leave some UUIDs
assigned. Preserve them, re-read, run dry-run, inspect remaining blanks, and
resume the appropriate explicit mode. Logs report counts/error row numbers only.
They never log names, cell contents, UUIDs or credentials. A partial initial
backfill remains resumable; new-record retries require the remaining row list.

## Proposed production rollout (requires separate explicit approval)

1. Finish the disposable Google Sheet rehearsal above and capture results.
   Inventory all live writers and agree who controls new-row assignment.
2. Back up/export the live tracker and record its version. Pause all editors,
   sorting, imports and external writers for the maintenance window.
3. Approve an owner-operated, production-targeted backfill runner separately.
   The provided test runner intentionally REFUSES production and has no bypass.
   Do not simply remove its guard. Keep the serving bridge read-only.
4. Preview the entire live grid: proposed rightmost activity_id header, blank-ID
   row count, invalid/duplicate report, and source size below the bridge cap.
   Resolve existing identity ambiguities manually. No writes on validation errors.
5. With approval of that exact dry-run, write the header and UUIDs ONLY to blank
   ID cells. Re-read all rows; prove uniqueness, valid UUID format, zero missing
   IDs, unchanged business cells and idempotent second run. Protect the ID column.
6. Only after another deployment approval, publish both the updated bridge and
   outreach-identity.gs. Preserve its existing read-only Sheet scope. Confirm
   legacy admin report and the identified snapshot with the real source.
7. Separately approve service-secret setup and remove the HTTP release lock.
   Set the outreach-ready flag only after bridge verification. Configure edge
   rate limiting and verify privacy/authentication before any NOA consumer.
8. Resume editors using the new-record policy. No sending, write-back or
   follow-up automation is part of this process.

## Rollback

Before assignment, discard the dry-run; no Sheet cells changed. After partial
assignment, preserve IDs and resume safely, rather than clearing and regenerating.
After a completed rollout, disable the feed gate and/or restore the prior bridge
version. The old bridge ignores the new column; leave the IDs in place. Do not
restore old business rows wholesale or renumber IDs after downstream consumption.
Recover accidentally erased IDs from the saved Sheet version. Keep the ID mapping
and audit evidence; no automated destructive rollback is provided.

## Local validation

- `npm test`: full repository suite, including feed and real Apps Script code
  executed in local VM fixtures. Focused sandbox runs also use
  `--test-isolation=none` to avoid the child-process spawn restriction.
- `npm run build`: production static-site build.
- `node --check` on the two server modules and feed test: JavaScript syntax.
  This JavaScript repository has no TypeScript/typecheck script or configuration;
  no unrelated typing toolchain was installed.
- `git diff --check` plus no-index whitespace checks for new files.
- Targeted credential-pattern scan; synthetic privacy sentinels and test tokens
  are fixtures, never real credentials. Gitleaks is not available on PATH.
- Tests use injected mock D1 and bridge responses only. They do not verify a
  live Cloudflare deployment, real D1 binding, account-level firewall, or Sheet.
