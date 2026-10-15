# Concept 5 editorial refinement

- **Preview:** https://codex-concept5-editorial-ref.shemotion.pages.dev/ (development branch only).
- **Reviewed deployment:** https://d60eae6c.shemotion.pages.dev/
- **Implementation commit:** [`156a7b35ba9926788e674916c6bbd7cb6914fcdb`](https://github.com/justaguyhoz/shemotion/commit/156a7b35ba9926788e674916c6bbd7cb6914fcdb).
- **Branch:** [`codex/concept5-editorial-refinement`](https://github.com/justaguyhoz/shemotion/tree/codex/concept5-editorial-refinement), based on the approved `9359c0d` preview. The following evidence-only commit adds this folder; website code is unchanged.

## Changes and visual decisions

- Centred the original Contact Shemotion button using flex alignment, balanced padding and line height. Wording, colour and destination remain unchanged.
- Restored a slow Instagram loop on a native scroll surface. Hover, focus and interaction pause it; touch swiping, mouse dragging, keyboard arrows and a separate pause/resume button work. Reduced motion disables automatic movement. Original post links and feed images remain.
- Distributed the footer into brand, legal-navigation and business/social columns. Desktop height is approximately 137px; mobile stacks without empty columns, with larger legal text and comfortable targets.
- Removed the redundant testimonial and experience labels. Kept useful location/navigation labels and the main headings, three stages and original portrait video/poster.
- Retained the wide movement photo, replaced the small portrait with a contrasting hands-and-fabric detail, and changed the note to **Move the way you feel**. The hero handwriting now sits clear of the flower on its own small paper layer.
- Reworked Events as warm textured, offset paper with a decorative date block, concise live details and integrated booking action. No event artwork appears on the homepage. Multiple-event browsing, availability states, booking URLs and administration remain intact.
- Recast Organisations as a concise commercial chapter with four settings and clear enquiry paths. The practice guide retains guidance, embodiment prompts, free expression, grounding, first-session information and questions in a quieter editorial structure.
- Preserved the existing palette, fonts, torn-paper treatment and floral movement. Selected flowers cross section boundaries; intentional photo bleed is clipped only at viewport edges. Floral pause/resume now works on internal pages too.

## Visual review

The full homepage, required desktop sections and desktop internal pages below were captured from the deployed Preview. Smaller supporting captures use the local Cloudflare runtime with the verified public records. Images are compressed JPEGs; no visibility styles were forced for capture.

| View | Desktop | Mobile |
| --- | --- | --- |
| Complete homepage | [1440px](homepage-1440.jpg) | [375px](homepage-375.jpg) |
| Events paper composition | [Desktop](event-band-1440.jpg) | [Mobile](event-band-375.jpg) |
| Testimonials and overlapping player | [Desktop](testimonial-1440.jpg) | [Mobile](testimonial-375.jpg) |
| Footer | [Desktop](footer-1440.jpg) | [Mobile](footer-375.jpg) |
| Organisations | [Desktop](private-groups-retreats-1440.jpg) | [Mobile](private-groups-retreats-375.jpg) |
| What Is Shemotion? | [Desktop](what-is-shemotion-1440.jpg) | [Mobile](what-is-shemotion-375.jpg) |
| Hero and Come Home | [Desktop](foundation-1440.jpg) | [Mobile](foundation-375.jpg) |
| Experience | [Desktop](experience-1440.jpg) | [Mobile](experience-375.jpg) |
| Contact | [Desktop](contact-1440.jpg) | [Mobile](contact-375.jpg) |

Additional views: [Katty desktop](katty-1440.jpg), [Katty mobile](katty-375.jpg), [Media desktop](media-1440.jpg), [Media mobile](media-375.jpg). Optional [homepage print PDF](homepage-print.pdf); browser screenshots are the primary visual reference because print simplifies some collage treatments.

**Repeatable handover:** keep each iteration in its own `docs/design-reviews/<iteration>/` folder; capture full 1440px and 375px homepages plus changed sections and internal pages; use compressed JPEGs; record the exact reviewed runtime commit and Preview URL; commit images and the report to the review branch; share direct GitHub blob/tree URLs. Keep older review folders intact. An evidence-only commit may follow the implementation commit so the report can identify the exact reviewed code without a self-referential commit hash.

## Validation

- Existing `npm test` passes; expanded suite **120/120 passes**. [Test log](test-results.txt), [build log](build-results.txt).
- Homepage checked at 320, 375, 390, 430, 768, 1024, 1440 and 1920px; **49 public-page/viewport checks**. No horizontal page overflow, broken displayed images or browser page errors. [Responsive and interaction results](qa-results.json).
- Header text centres within one pixel horizontally/vertically at all requested widths. Hero handwriting remains within the viewport. Internal links and anchors pass. [Links and measured proportions](links-and-metrics.json).
- Instagram automatic movement, hover/focus pause, explicit pause/resume, mouse drag, real post click, native touch swipe, seamless cycle rendering, wrap and reduced-motion manual access pass. [Instagram checks](instagram-qa.json).
- **15** empty/single/multiple-event viewport combinations pass, including keyboard browsing. [Event fixtures](event-fixtures.json).
- Menu, FAQ keyboard/Escape, Katty Read More/Less, original 9:16 video playback and no-JavaScript core content pass. Contact validation and mocked success/error paths pass without live delivery.
- Six Axe WCAG A/AA audits report **zero automated violations**. [Accessibility results](accessibility-results.json). These supplement the visual and keyboard checks.
- Read-only browser verification of the actual deployment: [results](deployed-browser-results.json).

## Assets and limitations

Three new generated photographic concepts, optimized as WebP: `concept5-detail.webp` (hands and fabric), `concept5-shared.webp` (anonymous shared movement scene for Organisations), and `concept5-grounding.webp` (quiet grounding detail for the practice guide). They are illustrative brand imagery, not evidence of real clients, participating organisations or testimonials. Katty's authentic image and Tallai footage/poster are unchanged. No new fonts, palette or third-party runtime dependencies were introduced.

Verification uses Chromium, including touch emulation; native Safari/iOS and Firefox have not been tested. Generated imagery remains subject to Katty's creative review. Contact delivery and admin writes were tested through existing tests/local mocks, not through valid live submissions. No backend changes, production data writes, main merge or production deployment were made.
