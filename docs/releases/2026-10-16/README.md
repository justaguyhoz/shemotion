# Shemotion Concept 5 — 16 October 2026 release

The user approved committing and deploying the selected Concept 5 direction, the supplied Katty photos and Spotify feature, with one final mobile footer improvement. This approval supersedes the earlier review-only hold.

## Change

The mobile footer now has left-aligned branding, a consistent two-column legal/navigation group with comfortable tap targets, a social/motion-control row, and separately stacked copyright and ABN details. All original destinations and business information remain. Desktop proportions are retained. The previously reviewed Katty photo replacements, Spotify media presentation and wider Concept 5 redesign are included.

## Checks completed before committing

- Full suite: **120/120 tests passed**, covering events, recurrence, booking states, contact persistence and duplicate protection, consent, mocked Apps Script delivery and failure handling, outreach aggregation, media, admin navigation and tracking. [Output](test-results.txt).
- Production build passed. [Output](build-results.txt).
- Actual local admin UI and HTTP APIs against local D1/R2: event create/draft/publish/edit/sold-out/delete; media UI create/draft/publish/edit/delete; image upload/read/removal; contacts/locations list APIs; mobile navigation; invalid request rejection. **13 checks passed**. Test event/media fixtures were removed. [Results](admin-backend-results.json).
- Access JWT verification with isolated generated RSA test keys: valid allowlisted user accepted; missing/malformed/tampered/expired/wrong-audience/wrong-issuer/future tokens and disallowed users rejected. **9 checks passed**. No live credentials or production authentication settings changed. [Results](access-verification.json).
- Existing production public/API routes and unauthenticated admin access gates passed; malformed and foreign-origin contact submissions rejected before storage or delivery. [Results](live-gates-before.json).
- Production D1 `PRAGMA quick_check` returned `ok`. Existing D1/R2 bindings and presence of required Access, contact webhook and outreach configuration were confirmed without exposing secret values.
- Responsive checks at 320, 375, 390, 430, 768, 1024, 1440 and 1920px: no overflow or JavaScript errors, both supplied photos load, contact fields and consent retained, FAQ closed, correct podcast URL, portrait video still 9:16. Two WCAG 2 A/AA and 2.1 AA axe audits passed with zero violations. [Results](qa-results.json).

No admin API, contact/delivery logic, Access middleware, database schema or admin interface changed from the previous production commit. Server-rendered public event pages and shared public page/media presentation changed with the redesign.

Interactive production admin login was not exercised because this session has no signed-in admin browser session. Its real workflows were exercised locally; live access protection was verified separately. No real enquiry, email, booking or outreach message was sent as a test. Delivery success/failure and persistence are tested with a controlled mocked Apps Script bridge.

## Visual evidence

[Mobile footer 320px](footer-320.jpg) · [375px](footer-375.jpg) · [390px](footer-390.jpg) · [430px](footer-430.jpg) · [Tablet 768px](footer-768.jpg) · [Desktop 1440px](footer-1440.jpg).

[Full desktop homepage](homepage-1440.jpg) · [Full mobile homepage](homepage-375.jpg) · [Local media administration](admin-media-1280.jpg).

## Rollback

**Prior production deployment:** `2c3c23c6-e236-41ae-b459-8d59c887bfd7`.

**Prior production code:** `157acb82c41e73440c02fd862550bc35b931804c` (also retained by the `pre-concept5-20261016` Git tag).

To restore the previous website immediately, use Cloudflare Dashboard → Workers & Pages → Shemotion → Deployments → the successful production deployment above → **Rollback to this deployment**. The equivalent authenticated API request is:

`POST /accounts/3a7edf3aa9818bac4a7ba36b27615784/pages/projects/shemotion/deployments/2c3c23c6-e236-41ae-b459-8d59c887bfd7/rollback`

Cloudflare code rollback does **not** roll back database contents, incoming enquiries, booking records or external services. No schema migration is part of this release. The only planned production data change is the approved podcast media record, imported idempotently by `scripts/content/2026-10-16-katty-podcast.sql` after the new assets are live. The Times record and event/contact data are untouched.

If the podcast also needs to be withdrawn, use the existing Media admin to change it to Draft/unfeatured, or apply the narrowly scoped `scripts/content/2026-10-16-katty-podcast-rollback.sql`. This preserves the record and does not affect any other media. The pre-release production media list contained only The Times item (id 1); the podcast did not already exist.

For a permanent code reversal, revert the release changes on main and deploy that commit through the normal pipeline. Do not reset history or restore the entire database, as that could discard enquiries received after release.
