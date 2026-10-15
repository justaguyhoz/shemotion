# Concept 5 — selected courtyard photograph

Review-only preview: https://42515e20.shemotion.pages.dev/

Implementation commit: [`72f6740b20b5e805912ea804896c3fb693547cae`](https://github.com/justaguyhoz/shemotion/commit/72f6740b20b5e805912ea804896c3fb693547cae).
Branch: `codex/concept5-editorial-refinement`. The following evidence-only commit adds this report and screenshots without changing the reviewed runtime.

## Changes and asset

The larger Come Home photograph now uses the selected option A courtyard scene with four women dancing. A standalone 1536 × 1024 adaptation adds framing space around the group for responsive cropping: `assets/concept5-courtyard-dance.webp`. It retains the selected women's poses, ivory/blush/taupe dresses, arched stone courtyard and warm light. This is generated illustrative brand imagery, not a photograph of actual participants or Katty.

The smiling close-up stays in the small portrait. The paper note is smaller and lower, and the larger photograph reserves space for the portrait so all four faces remain visible. The rest of the homepage, real Katty portrait, testimonial footage and all integrations remain unchanged.

## Deployed screenshots

| View | Desktop 1440px | Mobile 375px |
| --- | --- | --- |
| Come Home collage | [Desktop](come-home-1440.jpg) | [Mobile](come-home-375.jpg) |
| Full homepage | [Desktop](homepage-1440.jpg) | [Mobile](homepage-375.jpg) |

Tablet crops: [768px](come-home-768.jpg) · [1024px](come-home-1024.jpg).

## Verification

- `npm test`: 13 test-file reports passed; [output](test-results.txt).
- `npm run build`: passed.
- Chromium checks at 320, 375, 390, 430, 768, 1024, 1440 and 1920px: both correct images load, hero source unchanged, no document horizontal overflow or JavaScript errors. [Results](qa-results.json).
- Desktop and mobile crops visually inspected, then captured from the successful Cloudflare Preview using read-only requests. [Deployment browser results](deployed-browser-results.json).

No production deployment, merge, data changes, real bookings or contact submissions were made. This remains a creative review preview.
