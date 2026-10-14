# Shemotion V2.3 review

Baseline: V2.2 `702c6d964916393ebb50fb787875998467b36b80`.
Branch: `codex/editorial-refinement-v2-3`.

## Focused corrections

Homepage event cards now use a left image and right text composition. Desktop
cards are fixed at 560px, two fit in the 1144px rail, and additional cards scroll.
One card centres without stretching; two centre when they fit. Narrow screens
use a 96px image beside readable details and a separate 44px booking action. The
original detail link and booking action remain separate and accessible. Saved
image fit and focal point, ordering, statuses and destinations are unchanged.
Archive and individual event layouts are unaffected.

The homepage form is capped at 720px, with 12px gaps, an 80px resizable textarea
and 32px section padding. Four desktop short fields, tablet two-column and mobile
single-column layouts remain. Inputs retain 16px text and at least 44px height.
Submission, validation, attribution, consent, notification and success/error code
is untouched.

The existing Times record (published item 1) points to the same article and older
fallback thumbnail. V2.1 suppressed that thumbnail deliberately. V2.3 uses an
unchanged official 392×73 PNG wordmark downloaded from the publication's own site:
https://thetimes.com.au/images/0000/The_Bulletin.png
It is displayed by the official homepage with alt “The Times Australia”. Local
asset: `assets/the-times-logo.png`, 5,489 bytes; SHA-256:
`76a7b3368bd7401e329aee6b69f45f50a258878f0bcf68925551e9a57ce2ba29`.
No screenshot, redraw or generated mark was used. Other approved uploads still
render normally. The existing article destination and stored media record remain
unchanged. No Scout item was published.

## Verification

- `npm test` passes; expanded runner confirms **118 passing tests**, including a
  new official-logo/link/record-preservation regression check.
- `npm run build` and `git diff --check` pass.
- Browser QA uses one, two, three and five local event fixtures at 320, 375, 390,
  430, 768, 1024, 1440 and 1920px. No page overflow or browser script errors.
- Actual single-card measures: 560×317px at 1440/768px; 335×304px at 375px.
  Single and non-overflowing rails hide controls. All image/text layouts remain
  horizontal, and all fixture cards stay below 400px tall.
- Contact form: 720px desktop width, 80px textarea; comfortable responsive fields.
- Keyboard/arrows, touch swipe, end-of-rail control state, sticky anchors,
  mobile menu focus/Escape, native testimonial playback, article keyboard focus
  and native form validation pass. Supporting public routes pass overflow checks.
- Local screenshots include events (all four counts), contact and media at
  375/768/1440px and complete homepage at 375/1440px. Additional events are clearly
  labelled QA fixtures and were never stored in a live database. Analytics were
  suppressed during local visual review. Section captures temporarily hide the
  sticky header; full-page captures retain it.

## Cloudflare and scope

The authenticated Cloudflare plugin confirms the existing GitHub-to-Pages preview
workflow is already enabled for the correct repository/project. The production
branch remains main. No new authorisation, credential copy or settings change is
needed. The pushed V2.3 commit will trigger a review-only deployment; its exact
commit, environment, success stage, URL and unchanged production deployment must
be verified before delivery. See `docs/cloudflare-preview-workflow.md` for the
repeatable process. Final deployment verification accompanies the review package.

Preview shares the existing production D1 and R2 bindings. Only read-only public
checks and invalid-form validation are permitted in this review; no valid form
submission, admin save or media write is performed. No database records,
migrations, backend contracts, admin files or dependencies changed. Brand colours,
shared typography, dividers, testimonial and experience remain V2.2. Public HTML
changes outside the homepage are CSS cache revisions only.

Review is based on Chromium, not an independent screen-reader/cross-browser audit.
Production deployment and merging into main remain out of scope.
