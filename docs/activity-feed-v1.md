# Shemotion Activity Feed v1

## Status and implementation gate

Prepared server-side source boundary; not activated or configured. Production
Sheet metadata and its header were inspected for the disposable rehearsal;
no production source was changed. NOA ingestion is not implemented. The exported
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

Observed live header (metadata/header-only inspection, 2026-09-26): Priority,
Target, Category, Contact person, Contact route, Email / Form, Website, Pitch
angle, Desired outcome, Status, Draft date, Sent date, Follow-up date,
Response / outcome, Coverage / backlink URL, Notes, Stream, Outcome Type,
Response Date, Last Activity Date. There are 20 business columns; activity_id
belongs in U (21). Earlier compact fixtures omitted private fields and put it
in R; that fixture is not a production column map. Bridge headers are looked up
by name, not fixed column positions.
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

## Disposable Outreach ID Rehearsal

Dates: preparation 2026-09-26; native Sheet rehearsal completed 2026-09-27
(Australia/Brisbane). Branch: codex/shemotion-activity-identity-prep, starting
commit d9218f0bcf86cd20f1ba94d18241bc6a0f1ba7c5. No production execution.
Final fetch observed independent origin/main commit aa0a168 (legal-page wording
only); no merge/rebase was performed. This task does not update main.

### Environment and evidence boundary

A private native copy named `[DISPOSABLE] Outreach ID Rehearsal 2026-09-26`
was created in the Shemotion account's ChatGPT folder. Its tab is
`Outreach Tracker`, with the observed 20-column structure. Copied body rows
were removed/cleared before synthetic fixtures were written; production was
not edited. The copy was confirmed unshared. Its initial copy/revision history
may retain source content: keep it private; do not publish or share it as a
PII-free template. Test source is `test/helpers/outreach-rehearsal-fixture.js`.

Native Sheet API reads/writes exercised the real cell model. The repository's
pure UUID planner ran locally on those exact read-back values; only its reviewed
ID-cell writes were replayed to the disposable copy. Actual assigned IDs used
Node crypto.randomUUID, validated as v4. This is NOT evidence that the bound
Apps Script runner or Utilities.getUuid executed in Google. Those were tested
in the local VM; live authorization, script locking and protected-cell execution
remain manual gates. No Apps Script deployment or triggers were created.

### Captured results

| Check | Observed result |
| --- | --- |
| Header | activity_id appended at U; 20 business header values retained |
| Initial dry-run | 7 eligible records; 3 blanks; 2 distinct valid IDs; duplicate at rows 5/6; malformed row 7; whole assignment blocked; 0 writes |
| Dry-run integrity | Native CellData before/after identical, including formulas, notes, formatting and validation |
| Controlled fixture repair | Copied row 6 declared new and U6 cleared; malformed fixture U7 explicitly corrected to a known synthetic UUID; neither was silently repaired |
| Clean dry-run | 7 eligible; 4 blanks; 3 valid; no errors; proposed cells U2/U3/U6/U9 only |
| Assignment | 4 unique v4 UUIDs assigned; all existing valid IDs preserved |
| Business integrity | A:T CellData identical before/after assignment, including formula in P9, note, format, validation and row order |
| Idempotency | Immediate rerun: 0 writes; all 7 IDs valid |
| Mutable fields | Target, category, priority, status, sent/follow-up/response/activity dates, response/outcome and website/coverage edited; original UUID unchanged |
| Copied row | Full row copy retained UUID; duplicate detected; entire plan blocked with 0 writes |
| Copy recovery | Explicitly declared new outreach; ONLY copied U cell cleared; new UUID assigned; original retained |
| New row | New blank-ID synthetic row received one different UUID; no business-cell change during assignment |
| Total generated | 6 UUIDs (4 initial, 1 new, 1 copy); final 9 identified records, no missing/invalid/duplicate IDs |
| Reorder | Full A:U descending Target sort preserved the ID-keyed business CellData mapping |
| Filter | Basic filter enabled and cleared; read-back cells unchanged |
| Protection | Non-warning U:U protection installed on disposable only; owner-only editor list and requestingUserCanEdit=true returned |
| Bridge | Actual final synthetic grid projected locally; business output exactly matched legacy projection after removing activityId |
| Feed | 9 safe facts; deterministic totals: 9 contacted, 1 dated reply, 8 sent/1 replied, 8 high-priority, 0 due/overdue; unknown outcomes retained as unknown |
| Privacy | Synthetic person/email/pitch/private-note/formula/response sentinels absent from feed; tracker and derived provenance retained |

The blocked plan halts every assignment, not merely the erroneous rows. Valid
ID count means distinct valid IDs, not the number of cells matching a UUID regex.
The formula, note and validation are synthetic fixtures, not production content.
The later intentional edit/copy/sort steps are distinct from the ID-only integrity
comparison. No visual screenshot was taken; native cell/format metadata is the
verification evidence, not a claim of visual browser QA.

Local VM tests additionally prove production-target refusal, changed-snapshot
refusal, duplicate activity_id headers, ID formulas, unsafe scope, malformed IDs,
partial-write recovery and ambiguous required Target/Status header refusal. The
last check was added to the test-only runner; serving bridge behavior is unchanged.
Snapshot hashing covers values/formulas, not every formatting property; human
and other-script edits must remain paused during assignment. ScriptLock alone
is not a lock on collaborators or other Apps Script projects.

### Writer inventory and blockers

| Class / mechanism | Evidence and column behavior | ID consequence / production status |
| --- | --- | --- |
| A: human Sheet editors | Manual tracker is established; named actors and actual editing practices not confirmed | Can create/copy/edit/reorder/delete, paste formulas or import data. Rightmost U is compatible only with full-row sort/copy rules; protected IDs and explicit new-record assignment required. BLOCKER: owner confirmation |
| B: repository contact-webhook.gs | Sheets API GET plus named-header projection; manifest spreadsheets.readonly; no append/setValue/import writes | Rightmost U supported; no automatic assignment. Reader, not writer |
| B: test-tools/outreach-id-rehearsal.gs | New test-only owner-operated writer; named headers plus reviewed cell coordinates; production deny gate | Only blank ID/header setValue; no business writes; explicit initial/new-record modes; no triggers. NOT a production runner |
| B/F: deployed/bound scripts and installable triggers | Repository cannot enumerate deployed script versions, triggers or other projects | May use positional ranges or append/import; compatibility and ID handling UNKNOWN. BLOCKER |
| C: Shemotion admin | functions/api/admin/outreach.js requests snapshot; shared sanitizer reads; no tracker write route found | No row creation/edit/copy/assignment; adding U does not shift named fields |
| D: Opportunity Radar | Separate checkout a31b2619f51d1292100f1e09a98f43be60bd92a6; app/api/opportunities/route.ts/createManualConnection writes its D1 model; no Sheets/CSV writer found in app/db/lib/worker | Not a verified Sheet writer. Any operator export/copy handoff or deployment outside this checkout remains UNKNOWN |
| E/F: automation, forms, Zapier/Make/n8n, CSV/XLSX imports/exports | No integration writer found in reviewed repository; external configuration not inspected | Position/header assumptions, ID preservation and new-row handling UNKNOWN. BLOCKER: owner inventory |

No code search can establish that external writers do not exist. Confirm actor,
trigger, range/header mapping, copy/import/export behavior and pause procedure
for each before approving rollout. Exports must preserve IDs for existing records;
imports must not replace them or reuse them for genuinely new outreach. Retired
IDs must never be recycled. No automatic assignment path is approved or installed.
Recommended initial mode: explicit periodic owner-operated ID assignment, after
reviewing genuinely new blank-ID rows, rather than modifying every writer now.

### Permissions and remaining live checks

Recommend ordinary editors can edit A:T but cannot edit U, with owner-controlled
ID recovery and assignment. Google documents that the owner can always edit
protected ranges: [Protection reference](https://developers.google.com/apps-script/reference/spreadsheet/protection).
The actual disposable protection was verified; no additional editor was invited.
Ordinary-editor denial, full-row sorting with protected U, and bound Apps Script
owner execution still require live testing. Protection may constrain normal
editors' sorting: use filter views or owner full-row sorts, never partial A:T
sorts that detach IDs. Script execution needs an authorized identity able to edit
U; do not solve permissions with a broadly privileged public web app.

The approved account must complete the following manual bound-script rehearsal.
This is the remaining execution gate, not permission to change production:

1. Create a NEW blank Sheet named `[DISPOSABLE] Outreach IDs`; add tab `Tracker`.
   Use the observed 20 headers above plus activity_id in U, and ONLY the synthetic
   fixture. Use a fresh blank file for any second-editor test; do not share the
   native copy's potentially sensitive revision history. Keep the prepared
   native rehearsal copy as private evidence.
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
11. Protect U for owner assignment only. With an approved ordinary test editor,
    verify normal fields editable and U edits denied. As owner, create a genuinely
    new blank-ID row and run explicit assignment into protected U. Verify full-row
    sorting permissions and use filter views where required. Record execution
    logs and counts without private values, then remove test-editor access.

Writes are cell-scoped and not transactional. A failure may leave some UUIDs
assigned. Preserve them, re-read, run dry-run, inspect remaining blanks, and
resume the appropriate explicit mode. Logs report counts/error row numbers only.
They never log names, cell contents, UUIDs or credentials. A partial initial
backfill remains resumable; new-record retries require the remaining row list.

## Operational gate follow-up: 2026-09-27

Starting checkpoint: 4236554e50572bbd97d59ebb7cbbf4989b60877b on
`codex/shemotion-activity-identity-prep`. These are preparation results, not a
production migration. The earlier native-copy results above are not relabelled
as live bound-script results.

### Fresh synthetic-only environment

The new private [synthetic rehearsal Sheet](https://docs.google.com/spreadsheets/d/1IF-fmwH_p_NySVRX3ctGQ5MrI4KAE9fyuqZIWjhBaTI/edit)
is named `[DISPOSABLE] Synthetic Outreach Gate Rehearsal 2026-09-27`.
It was created from a synthetic workbook, NOT copied from production or the
previous rehearsal. No production body data was imported into its revision
history. Tab: `Outreach Tracker`; timezone: Australia/Brisbane.

It contains the 20 observed business headers plus U/activity_id; seven eligible
synthetic records, three blank IDs, two distinct valid IDs (one duplicated),
one malformed ID, and a blank row. P9 contains a synthetic formula and note;
J2:J11 has status validation; the header is frozen and formatted. Native read-back
confirmed the formula and validation. Browser visual inspection confirmed the
synthetic rows and header layout. Whole-column U has non-warning owner-only
protection; API metadata reports that the owner can edit it. No other account
was invited.

Extensions > Apps Script opened a Google account continuation that returned
"Page not found", including after Shemotion sign-in. The user has been asked
to open the bound editor manually and supply its project URL. No code was
installed or executed on this new Sheet. Consequently:

- Actual Utilities.getUuid execution: NOT VERIFIED.
- Live dry-run, assignment, rerun, snapshot/header failures and protected-cell
  script writes: NOT RUN. Local VM assertions are not substitutes.
- Fresh-Sheet UUIDs assigned: zero. Existing synthetic IDs remain fixtures.
- Fresh-Sheet sorting, filtering and copy recovery: not run; earlier native-copy
  and local test results remain separate evidence.
- Second-editor test: the owner elected to perform it manually; unresolved.

### Writer inventory: owner confirmation and inspected evidence

| Mechanism | Current evidence | Remaining owner verification |
| --- | --- | --- |
| Guy/manual edits | Owner-confirmed manager/editor; manual copying is possible | Confirm every workflow uses full-row sorts and copies business fields only for new records |
| Katty | Interaction with outreach confirmed as possible; direct Sheet editing UNKNOWN | Ask whether she edits the Sheet, uses the owner login, copies rows, or works only in email/admin |
| Sheet permissions | Read-only metadata reports private/unshared, one owner permission | Open Share and inspect actual access; metadata cannot rule out owner-account use by another person |
| Shemotion Website Integration | Authenticated Apps Script inspection: deployed Version 1, September 24 at 12:52 PM; selected historical source matched current editor source | Confirm this is the bridge configured for production and whether other projects exist |
| Known bridge functions | readTrackerRows_ uses Sheets REST GET and named headers; no Sheet-write calls or simple onEdit/onOpen/onChange/onFormSubmit functions found; no activity_id in deployed source | No new-ID assignment occurs; do not deploy local identity support yet |
| Installable triggers | Known project's Triggers page showed 0, without filters, for the signed-in Shemotion account | Other users' triggers/projects remain UNKNOWN; each relevant account must inspect My Triggers |
| Shemotion admin | Repository /api/admin/outreach route and sanitizer are snapshot readers, not Sheet writers | Owner confirms any separate admin tools not in this checkout |
| Opportunity Radar | Reviewed repository uses D1; no direct Sheet writer found | Human export/copy handoff or external deployment workflow UNKNOWN; owner must trace the actual handoff |
| Forms | No known writer per owner; not verified absent | Check Sheet Tools/Forms association and Forms response destinations |
| Zapier/Make/other automation | None known; external configuration not inspected | In each used service, search connections/jobs for this spreadsheet and record disabled as well as active jobs |
| External Apps Scripts/API integrations | UNKNOWN | Inspect Apps Script projects/triggers under each editor account; check Google Cloud/API clients and any external job configuration |
| CSV/XLSX imports, paste, export/reimport | No regular process known; cannot rule out | Ask all editors about File > Import, paste, IMPORTRANGE/formulas and export/reimport; retain IDs for existing rows only |
| Contact form | Separate D1 source; not an outreach Sheet writer in reviewed code | Do not classify notification email as a Sheet write |

The account's Apps Script dashboard showed one project. A Drive script-file search
returned none and was therefore NOT used as proof of absence. Production script
source, deployment metadata and triggers were inspected read-only. No properties,
deployment configuration or production cells were changed. No other writers are
marked ABSENT merely because a repository search found none.

For every unresolved writer, record owner, create/edit/copy/delete/import
functions, header-name versus fixed-column ranges, pause method, and whether it
preserves existing IDs. A rightmost U column does not shift A:T, but fixed-width
imports and A:T-only sorts remain unsafe. Unknown writers block production.

### Finish the bound-script and second-editor tests

Use ONLY the fresh synthetic Sheet linked above. Open Extensions > Apps Script
as its owner; provide that bound project URL if the account redirect still fails.
Install `outreach-identity.gs` and `test-tools/outreach-id-rehearsal.gs`, not the
serving bridge or production runner. Follow the current-document-only manifest
and no-deployment instructions above. Test properties for this file are:

- OUTREACH_ID_TEST_SPREADSHEET_ID: the fresh Sheet ID in the link.
- OUTREACH_ID_TEST_SHEET_NAME: Outreach Tracker.
- OUTREACH_ID_TEST_CONFIRM: DISPOSABLE_ONLY.
- OUTREACH_SPREADSHEET_ID: live ID as a deny-target guard only.

Run the invalid-fixture dry-run first: expect 7 eligible, 3 blanks, 2 distinct
valid IDs, duplicate rows 5/6, malformed row 7, and zero writes. Confirm assignment
refuses. In the disposable only, declare row 6 genuinely new and clear U6;
deliberately correct U7 to a reviewed, unused synthetic v4 UUID. Expect 4 blanks
and 3 existing valid IDs on the clean dry-run. Capture full native A:T CellData
before assignment; compare afterwards, including formula, notes, validation,
formatting and order. Assign, validate all 7 IDs, rerun for zero assignments,
and exercise changed-snapshot/header/ID-formula refusal.

The owner will conduct the second-editor test, choosing and granting access to
an ordinary account themselves. Do not share the older native copy:

1. In a separate ordinary-editor session, edit Target/Status in the fresh Sheet.
2. Attempt U-cell edit: it must be denied, not merely warn.
3. Filter/unfilter; verify IDs unchanged. Try full A:U sorting. If protection
   blocks it, use owner-only full-row sorts or filter views; never sort A:T alone.
4. Have the owner create a new blank-ID record and run reviewed new-record
   assignment into protected U. Verify the owner script succeeds without
   broadening permissions and the original IDs are unchanged.
5. Owner copies an identified row: duplicate must block, never auto-repair.
   Confirm it is new, clear only the copy's ID, dry-run, authorize its exact
   row in OUTREACH_ID_TEST_NEW_ROWS, assign and verify a new UUID.
6. Record results and remove temporary editor access after testing.

### New-row operating decision

V1 recommendation: explicit periodic owner-operated assignment, not an automatic
trigger. Guy (and only confirmed editors) creates business rows. The owner checks
that each blank ID is genuinely new, runs a fresh dry-run, authorizes exact rows,
then assigns. A temporarily blank ID makes the future ID-aware bridge/feed fail
closed, not report zero outreach. This can also interrupt the admin snapshot
once that bridge is deployed; coordinate short assignment windows. The currently
deployed legacy bridge is unchanged. Recover erased existing IDs from history,
never reclassify them as new. Copied rows follow the explicit rule above.

### Production runner review draft: not installed or executed

`integrations/google-apps-script/migration-tools/outreach-id-production.gs`
is a separate owner-operated bound-script draft, never part of the serving
bridge. `PRODUCTION_OUTREACH_WRITES_APPROVED_ = false` rejects write entrypoints
before any Sheet access. It was exercised only in a local VM; tests enable the
switch in memory without altering the file. Production dry-run was NOT executed.

- Allowlist: exact live spreadsheet ID and Outreach Tracker tab ID; effective
  user must match file owner. Shared-drive/no-owner cases fail closed.
- Exact A:U headers and 21 used columns; fewer than 5,000 used rows. No header
  creation or business-column edits. Whole U must have strict owner-only range
  protection, no domain-edit permission, and cover every physical row.
- `dryRunProductionOutreachIds` writes no cells and generates no UUIDs. It
  invalidates the prior approved snapshot and records a clean fingerprint/time
  in Script Properties; duplicates/malformed IDs block and ID formulas refuse.
- Fingerprints cover raw/display values, formulas, notes, number formats,
  backgrounds, font colors/weights/sizes, horizontal/vertical alignment and
  validation criteria. They do not capture every possible formatting property,
  merge/protection change or external writer. Preserve full CellData separately
  and pause humans/other scripts; ScriptLock alone is not a collaborator lock.
- After separate approval and switch review, the owner copies the dry-run hash
  into OUTREACH_PRODUCTION_APPROVED_SNAPSHOT and sets
  OUTREACH_PRODUCTION_WRITE_CONFIRM to ASSIGN_BLANK_IDS_ONLY. The plan expires
  after 15 minutes, rejects future timestamps, and must exactly match current
  cells. These are approval controls, not credentials.
- `backfillProductionOutreachIds` is initial-only. On first use it requires
  reviewed initialization even if every row already has an ID (zero writes).
  Once initialized, reruns with no blanks are no-ops; later blanks require
  `assignNewProductionOutreachIds` and OUTREACH_PRODUCTION_NEW_ROWS containing
  exactly the reviewed new row numbers. Row numbers authorize cells, not identity.
- Both assignment entrypoints acquire ScriptLock, recheck the source after
  planning, consume approvals before writes, check each cell remains literally
  blank/no formula, and write only its U value. Utilities.getUuid is validated by
  the existing planner; all existing IDs are preserved.
- Post-write checks compare business-field hash, every existing ID, assigned
  values and full identity audit. No business rollback is attempted on failure.
  Logs contain counts, safe error/row codes and an opaque snapshot hash, not
  business content, generated UUIDs or raw exceptions.
- Partial writes persist and must be retained. Obtain a new snapshot/approval
  before continuing. Actual permissions, authorization scopes, Utilities runtime
  and execution limits remain live-test gates. The owner identity check may
  require userinfo.email authorization in addition to current-document access;
  review the actual consent screen before authorizing, never add Gmail scope.

Remaining approval blockers: live bound-script run, ordinary-editor test,
unresolved writer inventory, and independent review of this production runner.
No production UUID migration is recommended yet.

## Proposed production rollout (requires separate explicit approval)

1. Finish bound Apps Script and ordinary-editor tests above; capture evidence.
   Confirm every writer, deployed script/trigger and import/export path with the
   owner. Resolve all UNKNOWN entries before requesting production approval.
2. Review and approve the separate production runner described above, including
   its write switch, owner identity scope and target allowlist. It is only a
   draft, not installed or executed. The test runner intentionally REFUSES
   production and has no bypass; do not remove its guard. Keep the bridge read-only.
3. Back up/export production, save its version and restricted business-cell
   snapshot (values/formulas/notes/formatting/validation/order). Verify recovery.
4. Pause all editors, sorts, imports and script/automation writers; re-read and
   verify exact source identity, header structure and size below the bridge cap.
5. Append rightmost activity_id (U only if header is still the observed A:T).
   Protect the whole ID column for approved owner assignment; no broad editor grant.
6. Run the separately approved runner in dry-run mode; inspect eligible/blank/
   valid counts, duplicate/malformed/ambiguous-header errors and zero-write report.
7. Abort on any error or changed source snapshot. No silent repair. Approve the
   exact clean plan before any UUID assignment.
8. Assign only blank eligible ID cells. Preserve all pre-existing IDs. On partial
   failure retain successful assignments, re-read and approve a fresh remaining plan.
9. Re-read business CellData and verify the pre-write snapshot/checksum unchanged;
   validate every ID, uniqueness, blanks and record count. Resolve discrepancies
   before resuming work, without overwriting business data from an old backup.
10. Rerun dry-run and assignment: zero additional IDs; record audit counts and
    secure evidence, not private row contents in public logs.
11. Only after another deployment approval, publish both the updated bridge and
   outreach-identity.gs. Preserve its existing read-only Sheet scope. Confirm
    legacy admin fields, named-header lookup, UUID output and privacy with production.
12. Resume editing under protected-ID rules. Owner periodically reviews new rows;
    copies of new outreach clear ONLY the copied ID after identifying the original.
    Restore accidentally erased original IDs from history instead of regenerating.
13. Monitor new/copy/import/sort behavior, missing-ID failures and writer compatibility.
14. Separately approve service-secret setup and remove the HTTP release lock.
   Set the outreach-ready flag only after bridge verification. Configure edge
   rate limiting and verify privacy/authentication before any NOA consumer.
15. Only then consider NOA ingestion. No sending, write-back or follow-up automation.

Production UUID rollout is NOT recommended for approval yet: unknown writers,
live bound-script execution and ordinary-editor permission checks remain blockers.

## Rollback

Before assignment, discard the dry-run; no Sheet cells changed. After partial
assignment, preserve IDs and resume safely, rather than clearing and regenerating.
After a completed rollout, disable the feed gate and/or restore the prior bridge
version. The old bridge ignores the new column; leave the IDs in place. Do not
restore old business rows wholesale or renumber IDs after downstream consumption.
Recover accidentally erased IDs from the saved Sheet version. Keep the ID mapping
and audit evidence; no automated destructive rollback is provided.

## Local validation

- Operational-gate preparation (2026-09-27): full suite 118/118 passed, including
  9 new production-runner VM tests. Fresh Sheet creation/protection/read-back
  passed; live bound-script and ordinary-editor checks remain blocked/pending.
  No serving runtime code changed. Build passed. This checkpoint does not
  convert earlier VM or native-API results into live Apps Script evidence.
  Focused UUID/feed/security/runner suite: 39/39 passed. GS VM compilation and
  JS syntax checks passed; diff whitespace and targeted credential scans passed.
  Gitleaks remains unavailable and no scanner was installed. There is no
  repository typecheck script; no new typing toolchain was added.

- Rehearsal checkpoint (2026-09-27): full suite 109/109 passed (Node includes
  helper-module discovery); focused UUID/feed suite 30/30 passed. Build, JS/GS
  syntax checks, whitespace checks and targeted changed-file credential scan
  passed. Gitleaks unavailable; no scanner was installed. No typecheck script
  exists. No runtime/server/frontend module changed in this checkpoint.
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
- Automated tests use mock D1 and bridge responses. The separate native Sheet
  rehearsal above verifies cell behavior, not a deployed Apps Script, Cloudflare
  deployment, real D1 binding, account-level firewall or production activation.
