# Concept 5 — Come Home photograph refresh

Review-only preview: https://1334387e.shemotion.pages.dev/

Implementation commit: [`aec59c5ca67c22bed34e056a8dfbf1892d99249c`](https://github.com/justaguyhoz/shemotion/commit/aec59c5ca67c22bed34e056a8dfbf1892d99249c).
Branch: `codex/concept5-editorial-refinement`. A subsequent evidence-only commit adds this report and screenshots without changing the reviewed runtime. Production is unchanged.

## Changes

- Small portrait: reuse the existing approved generated `assets/v3-joy.webp` smiling close-up, with the focal position adjusted for the narrow frame.
- Larger Come Home photo: new generated `assets/concept5-home-calm.webp` (1536 × 1024, approximately 208KB), showing a seated woman in ivory linen, in warm courtyard sunlight with olive-leaf shadows. The side profile, lowered arms, setting and quieter pose distinguish it from the back-to-camera, raised-arm hero.
- Keep faces visible in responsive crops. Preserve the existing torn framing, handwritten note, composition, text and floral details. Hero and Katty photographs remain unchanged.

The generated photos are anonymous illustrative brand imagery, not representations of Katty or evidence of actual participants or testimonials. No third-party image was acquired and no new runtime dependency was added.

## Deployed screenshots

| View | Desktop 1440px | Mobile 375px |
| --- | --- | --- |
| Come Home composition | [Desktop](come-home-1440.jpg) | [Mobile](come-home-375.jpg) |
| Complete homepage | [Desktop](homepage-1440.jpg) | [Mobile](homepage-375.jpg) |

## Verification

- `npm test`: all 13 test-file reports passed. [Test output](test-results.txt).
- `npm run build`: passed.
- Responsive Chromium checks at 320, 375, 390, 430, 768, 1024, 1440 and 1920px: correct image sources, both images load, meaningful alt text, unchanged hero, no horizontal overflow or JavaScript errors. [QA results](qa-results.json).
- Visually inspected the desktop and mobile crops, then captured the live preview at both sizes using read-only requests. [Deployed browser results](deployed-browser-results.json).

No forms were submitted, no bookings were made, no backend or admin functionality was modified, and no production data was changed. No outstanding technical issues were found; this preview is ready for creative review.
