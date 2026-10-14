# Shemotion V2.2 review

Baseline: `ec1876a19364d5d2b3ebc7cdec5c64fc54cba60b` (V2.1).
Branch: `codex/editorial-refinement-v2-2`.

## Changes

- Reduced homepage hero and event padding, the hero headline and portrait caps,
  and the heading-to-rail gap. Hero actions share a row when space permits and
  wrap on narrower phones. The existing events-first order remains unchanged.
- Unified all major homepage section backgrounds to existing warm cream
  `#f7f2ec`. Replaced full-width section borders with aligned 1px inset rules,
  using the existing low-contrast divider colour and shared 1180px measure.
  Hidden events do not leave a leading divider. Component backgrounds, imagery,
  form fields, video cover, buttons, icons and the shared footer are retained.
- Changed the heading to “Shemotion in the Media”. No media links or records changed.

Measured with the same published-content snapshot and loaded brand fonts:

| Viewport | Hero height, V2.1 → V2.2 | Events height, V2.1 → V2.2 | Hero headline |
| --- | --- | --- | --- |
| 375px | 966 → 795px | 733 → 709px | 37.6px |
| 1440px | 565 → 491px | 849 → 777px | 52px |

## Verification and evidence

- `npm test`: passes. The default runner reports 13 passing files in this cloud
  environment; `node --test --test-isolation=none` confirms **117 passing tests**.
- `npm run build` and `git diff --check`: pass.
- 12 actual Chromium screenshots: full homepage, hero, single events, multiple
  events, adjoining opening sections and editorial transitions at 375/1440px.
- 24 layout states at 320, 375, 390, 430, 768, 1024, 1440 and 1920px, with zero,
  one and five events: no page overflow or browser script errors. All visible
  major sections have the same cream surface; divider widths match and their
  height is 1px. One-event cards remain 320px where space permits and controls hide.
- No post-load layout shifts observed after fonts and initial event loading settled.
  Initial asynchronous event insertion remains the existing V2.1 behaviour.
- Browser regression checks passed for sticky anchors, menu Escape/focus, native
  testimonial playback, event keyboard/arrows and touch swipe, end-of-rail control
  state, media focus and native form validation. Supporting public routes also
  passed overflow checks. No live submissions or booking checkouts were performed.

The separate review package includes `index.html`, the 12 PNG screenshots,
`baseline.json`, `measurements.json`, interaction results and test output. Open
`homepage-375.png` or `homepage-1440.png` for the full page, `opening-*.png` for
hero/events adjacency and `transitions-*.png` for the divider treatment. Section
captures temporarily hide the sticky header to avoid capture obstruction; full
homepage captures retain it. Opening/transition crops come from the actual full
homepage screenshots.

## Files and scope

Presentation changes: `styles.css`, `shared/media-features.js`.
Updated existing heading assertions: `test/media-features.test.js`.
CSS cache revisions only: `index.html`, `shared/public-pages.js`,
`private-groups-retreats/index.html`, `what-is-shemotion/index.html`,
`privacy/index.html`, `terms/index.html`, `cancellations-refunds/index.html`.
Documentation: `docs/design-system.md`, `docs/v2-2-review.md`.

No admin code, browser application logic, API contracts, SEO content, tracking,
booking logic, database records, migrations, dependencies or media assets changed.
Screenshots use a local build with read-only public-content snapshots; additional
items are local QA fixtures. Analytics endpoints were suppressed during review.
Verification used Chromium rather than a complete cross-browser audit. No
unresolved layout defects were found in the reviewed states.

No Cloudflare deployment was requested or performed. No merge into main occurred.
