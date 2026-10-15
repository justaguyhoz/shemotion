# V2.6 pre-approval polish

Base: verified remote development commit `9e7b103d5b3267d715f619af1c4d3d1c18e155f7`, matching the supplied V2.5 preview and including prior mobile and focal corrections. Branch: `codex/editorial-refinement-v2-6`.

- Testimonial eyebrow: REAL WOMEN. REAL EXPERIENCES. Existing main heading, introduction, video, poster and caption retained.
- Homepage Afterglow excerpt: An evening of cacao, expressive movement and joyful dancing for women over 30. It is a presentation override keyed to the existing slug. The full description and individual event page remain unchanged. The override is not line-clamped.
- Media and Instagram external arrows now share the same small inline SVG design, with decorative accessibility attributes. Existing destinations, tracking and keyboard links remain intact. No icon dependency added.
- Only mobile organisations invitation and contact supporting paragraphs use a modest 15px size with 1.65 line height. Labels, form controls and global typography remain unchanged.
- Reveal styles are enabled only after observer initialisation rather than by an early head script. No-JavaScript and failed-module loads therefore retain visible static content. Existing screen animations and reduced-motion behaviour remain. Print rules force reveals visible, disable animation, unstick the header, release event-rail overflow and reduce print-only spacing/video size.

## Verification

`npm test` passes all test files; expanded Node suite passes 120 tests. Production build passes. Added a focused regression test verifying the excerpt does not mutate the source event or affect other events; updated the existing reveal bootstrap assertion.

Actual Chromium checks at 320, 375, 390, 430, 768 and 1440px show no page overflow. Screenshots at the four requested widths use normal motion and natural scrolling, with no forced visibility styles. Complete excerpt, cover mode and saved 93% / 18% focal position, testimonial text, media/Instagram SVGs, invalid contact validation and user-initiated video playback pass. No browser console/page errors.

Fresh unscrolled normal-motion homepage PDF contains all essential headings and content, with five A4 pages and no blank pages. Static no-JavaScript content and PDF, and reduced-motion content visibility are verified. Native Safari is unavailable in this environment; browser verification uses Chromium. No valid live contact submission is sent.

No backend, admin, database records, images, migrations, dependencies or production settings are changed. Preview publication uses the existing GitHub integration with the connected justaguyh account and project `shemotion`; production branch remains `main` at `157acb82c41e73440c02fd862550bc35b931804c`.
