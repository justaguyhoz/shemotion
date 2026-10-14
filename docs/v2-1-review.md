# Shemotion V2.1 review

Baseline: `201cb83d362f982626b2aa81cff6a486106c5dd9`.
Review branch: `codex/editorial-refinement-v2-1`.

## Visual corrections

- Retained Marcellus 400 and Inter 400/500/600. Marcellus has no supplied 300
  weight; the lighter hierarchy comes from regular weights, restrained sizes,
  measures and spacing. Public section headings cap at 42px, supporting headings
  at 28px, body at 16px and eyebrows at 11.52px. Hero/page titles cap at 56px.
- Centred the 900px contact form, removed its surrounding border, retained four
  desktop fields and responsive stacking, reduced the textarea to 96px and made
  the submit button content-sized. Validation and delivery code are unchanged.
- Centred the Tallai player below the requested introduction. Added a lightweight
  cream/blush local SVG cover and accessible play button. Native controls remain;
  there is no autoplay. The original video and JPEG poster are unchanged.
- Centred the three experience columns, reduced desktop icons to 76px and numbers
  to 23.2px, and retained fine dividers and all methodology wording.
- Fixed event cards at 320px with 16:10 preview artwork and existing fit/focal-point
  data. One- and two-card rails shrink to their contents; three fit on desktop;
  additional cards scroll. Controls hide when scrolling is unnecessary. Short
  descriptions preview three lines; a visible detail prompt links to the full
  content. Start/end times and the separate booking action remain visible.
- Replaced the media heading, removed its eyebrow, containers and minimum heights,
  and used compact publication identities. The known Times fallback artwork is
  rendered as its publication name without changing its stored record or link.
  Other approved uploads retain natural proportions. Four-plus entries use an
  even grid with small alternating offsets. No publication state was changed.
- Applied the shared typography and quieter borders/shadows to public supporting
  pages. Header offsets now follow the measured sticky header height; hash targets
  are restored after event loading.

## Files modified

- Public styling and interactions: `styles.css`, `script.js`, `navigation.js`.
- Public markup/cache revisions: `index.html`, `private-groups-retreats/index.html`,
  `what-is-shemotion/index.html`, `privacy/index.html`, `terms/index.html`,
  `cancellations-refunds/index.html`, `shared/public-pages.js`.
- Media presentation: `shared/media-features.js`.
- Local poster: `assets/tallai-testimonial-cover.svg`.
- Existing regression coverage: `test/events.test.js`, `test/media-features.test.js`,
  `test/public-interactions.test.js`.
- Documentation: `docs/design-system.md`, `docs/v2-1-review.md`.

## Verification

- `npm test`: passes. Node's default isolated runner reports 13 passing files in
  this environment. `node --test --test-isolation=none` confirms **117 tests pass**:
  the original 115 plus two playback/fallback regression checks.
- `npm run build`: passes. `git diff --check`: passes.
- 48 Shemotion browser screenshots at 375px, 768px and 1440px: full homepage;
  contact, testimonial, experience; events/media with one, two, three and five
  entries; events archive, individual event, organisations and Approach pages.
- Layout measurements for one/two/three/five items at 320, 375, 430, 768, 1024,
  1440 and 1920px: no page overflow or browser script errors. At 1440px the single
  card measures 320px, its rail 328px, the single publication tile 280px and the
  contact form 900px. Single and non-overflowing rails hide controls.
- Further overflow checks on all public supporting routes, including the three
  policy pages, at 320, 430, 1024 and 1920px: pass.
- Browser interactions: sticky-anchor clearance at all seven widths; mobile menu
  Escape/focus restoration; paused-until-click video with successful native
  playback; carousel arrows, keyboard and touch swipe; disabled next control at
  the rail end; media keyboard focus; native contact validation: pass.
- Default text contrast: charcoal on cream 7.87:1, muted text on cream 4.83:1,
  button text on green 8.70:1. Field boundary on white: 3.28:1. Inputs and primary
  buttons retain at least 44px height. Existing focus treatment is retained.

## Screenshot evidence and visual review

The separate `shemotion-v2-1-review.zip` contains an HTML screenshot gallery,
measurement and interaction JSON, browser screenshots and this report. Filenames
include `contact-1440.png`, `testimonial-375.png`, `experience-1440.png`,
`events-single-1440.png`, `events-5-375.png`, `media-single-1440.png`,
`media-5-1440.png`, `homepage-375.png`, `events-archive-1440.png` and
`organisations-375.png`. Section-only captures hide the sticky header temporarily
so it does not obscure tall captures; full-page captures retain it.

Visual inspection compared restrained heading scale, centred manifesto-like
columns, fine rules and open compositions with CHAIN's About page. Its separate
reference capture disables external scripts, so lazy team portraits are absent;
the typography and manifesto composition are available for comparison. Shemotion
keeps its own branding and purpose-specific public layouts.

## Scope and limitations

Screenshots use local built files, real public rendering handlers and read-only
snapshots of the live public event API and V2 media markup. Additional events and
publications are clearly labelled local QA fixtures. They were never written to
production. Analytics endpoints were suppressed during browser review. Email
notification delivery and admin write operations were covered by existing tests,
not exercised against live services. Browser review used Chromium; this is not
an independent screen-reader or cross-browser audit.

No admin files, API contracts, database migrations, dependencies, production
records or production media changed. Scout remains unpublished because no
publishing operation was performed. The original Tallai footage is untouched.

Cloudflare credentials and an authenticated Wrangler profile are not available
in this cloud environment. No deployment command was run, and there is no new
verified Cloudflare Preview URL. Review the branch and screenshot archive, then
use an authenticated environment to deploy **only this branch** to Pages preview
with an explicit `--branch codex/editorial-refinement-v2-1`. Confirm preview data
bindings are isolated before exercising write flows. Never use the unqualified
`npm run deploy` command for this review.
