# Shemotion V3 review

Branch: `codex/shemotion-v3-collage`.
Baseline: verified V2.7 `e85f89ce225b8bfbe93fec2ee498a45449a31162` (successful Cloudflare Pages preview). Production/main remains `157acb82c41e73440c02fd862550bc35b931804c`. All previous V2 branches are preserved.

## Implementation

Replaced the public homepage composition with the approved warm editorial direction: large serif hero, natural movement photographs, cream/blush paper layers, irregular torn edges, botanical artworks, handwritten notes, olive rounded controls, desktop social rail, three actual experience stages and a chocolate testimonial panel with an overlapping portrait player. Meet Katty retains her real studio portrait in a tighter CSS crop. The media section uses the existing publication-state renderer. Organisations, the real Instagram snapshot, full contact form, FAQs and business footer remain.

Review steering incorporated: removed public group-photograph placements; added a second back-to-camera movement photo and a smiling close-up; introduced cosmos/chamomile alongside the original floral artwork; added gentle pausable motion with reduced-motion support; moved Contact after Instagram. The real portrait source remains unchanged, as do the original media files.

The existing events API, calendar/recurrence ordering, booking-state presentation, tracking/attribution and admin interfaces are retained. Homepage event cards omit artwork. Archive/detail artwork and saved framing remain. Afterglow's requested compact excerpt is derived only when its stored description contains that actual phrase; future admin changes fall back to the updated description. Date, time, audience and booking destinations remain data-driven.

Read-only verification against published records confirmed:

- Shemotion Afterglow at Stellar: 23 October 2026, 7–9 pm, Women only, active booking destination, stored cacao/dance description for women over 30.
- The Times: **When Did We Stop Moving for Joy?**, https://thetimes.com.au/lifestyle/health/53105-when-did-we-stop-moving-for-joy . Only this published, featured media record is displayed. No Scout record or invented publication/testimonial is added.

## Assets

| Asset | Source and placement |
| --- | --- |
| `v3-movement.webp` | Generated anonymous back-to-camera ivory-dress movement scene; hero |
| `v3-meadow.webp` | Generated companion back-to-camera meadow scene; second section, organisations and guide |
| `v3-joy.webp` | Generated anonymous smiling close-up; small second-section inset and guide image |
| `v3-botanical.webp` | Generated transparent dahlia/wildflower illustration; selected collage corners |
| `v3-cosmos.webp` | Generated transparent cosmos/chamomile illustration; alternate floral placements |
| `v3-paper.svg`, `v3-sun.svg` | Lightweight authored grain and logo ornament |
| `assets/fonts/` | Self-hosted subsets of Cormorant Garamond, Inter and Caveat; OFL licenses included |
| `about-katty.jpg` | Existing approved Katty portrait, unchanged source, CSS crop only |
| Tallai MP4 and branded SVG poster | Existing original footage/poster, user-initiated native controls, 9:16 |
| Shemotion logo, stage icons, Instagram covers, Times logo | Existing approved assets |

Generated photographs are illustrative brand concepts, not actual participant, event or coach photography. No mockup pixels were extracted. No new photo asset remains technically required for this preview. Katty should review the generated imagery/artistic direction before production; owned photography could replace these files later without changing the layout. Original generated PNGs are retained in the workspace; production uses optimized WebP derivatives. No synthetic likeness replaces Katty. Existing original repository photographs are preserved, but group-photo placements are removed from the public templates.

## Verification

- `npm test`: pass. Expanded `node --test --test-isolation=none`: **120/120 pass**. Existing presentation assertions updated for the new hero/order/imagery; backend and booking tests retained.
- `npm run build`: pass. Locked dependencies unchanged; no runtime library added. V3 CSS and self-hosted assets included by the existing build.
- Homepage: 320, 375, 390, 430, 768, 1024 and 1440px. No horizontal page overflow; image loading, full-width message field, actual video aspect ratio and player overlap verified.
- Seven public routes at six widths: **42 layout checks**, one semantic H1 each, no horizontal overflow. Archive, live event detail, guide, organisations and all three legal pages.
- **15 local event-count/viewport combinations** (0/1/2/3/5 at 375/768/1440), including discovery controls and ArrowRight keyboard navigation. No-event state retains Explore Experiences.
- Real local Tallai video playback succeeds after user activation. Native intrinsic dimensions are 9:16 at every checked width. Menu/Escape, FAQ keyboard/Escape, biography Read More/Less and no-JS core content pass.
- Contact invalid submission is blocked. Local mocked success, retry and failure handling pass; optional consent and all original fields retained. No live contact delivery/admin mutation performed.
- Floral pause/resume, persisted preference and reduced-motion disablement pass. Form placement after Instagram verified.
- Axe WCAG 2 A/AA and 2.1 AA: **zero automated violations** across mobile/desktop homepage and mobile archive, detail, guide and organisations. Automated audits do not replace the visual and keyboard checks above.
- Normal-motion screenshots captured by scrolling the actual page; reveal styles were never forced for captures. See `review/` for homepage, key sections, public pages and JSON evidence.

## Deployment and data safety

Use the existing `shemotion` Git-to-Cloudflare Pages integration under the connected justaguyh account. Publishing this dedicated branch triggers a Preview build only. Require the deployment to match the exact branch and commit and report `environment: preview`, `deploy: success` before delivery. No main merge, production deploy, project configuration change, credential change or production data modification.

All remote D1 verification was SELECT-only, with `rows_written: 0` and `changed_db: false`. Browser testing used a local-only D1 database populated with the verified public records; fixture writes/migrations never targeted remote D1. The existing hosted preview may use shared data bindings, so remote checks stay read-only.

## Practical limits

QA uses Chromium; Safari/iOS and Firefox native device checks have not been performed. No valid live form submission or live admin save is attempted. Generated images require creative review before production. The direct public site blocks the runner's generic HTTP client (Cloudflare 1010), so remote content/deployment verification uses connected Cloudflare records and an actual browser where available. No security setting is changed to work around that restriction.
