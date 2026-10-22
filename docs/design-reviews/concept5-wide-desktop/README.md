# Concept 5 — wide desktop proportions

The user approved correcting the narrow desktop presentation, then committing and deploying it. This is a layout and typography refinement of the approved editorial design.

## Changes

- One shared desktop frame for the header, content sections and footer: 1440px at a 1920px viewport, growing smoothly to a 1600px cap on larger displays. Existing gutters limit the frame at smaller desktop widths.
- Remove nested 940px and 960px caps from Meet Katty and the organisations invitation. Scale the supplied photographs, hero and portrait player proportionately while keeping paragraph reading widths comfortable.
- Increase wide-desktop body copy from 12–14px to 15–17px, with larger headings, steps, labels and controls.
- Anchor selected flowers and side social navigation to the content frame, keeping the backgrounds and torn edges full bleed.
- Let the three existing published media records (Scout, The Times and Spotify) occupy a balanced row where space permits. Their records, order, links and publication states are unchanged.
- Preserve mobile/tablet layout, centred steps, original imagery, native 9:16 user-initiated testimonial playback, floral/Instagram motion controls, navigation, booking, forms, consent, tracking and admin functionality.

All presentation changes are inside `@media screen and (min-width:1200px)`. Print styling is unchanged. No production data, API, schema, admin or backend code changes are included.

## Visual comparison

- [Before at 1920px](before-homepage-1920.jpg)
- [After at 1920px](homepage-1920.jpg)
- [Standard desktop 1440px](homepage-1440.jpg)
- [Wide desktop 2560px](homepage-2560.jpg)
- [Mobile 375px](homepage-375.jpg)

Individual desktop sections: [hero](hero-1920.jpg), [Come Home](come-home-1920.jpg), [Experience](experience-1920.jpg), [events](events-1920.jpg), [testimonials](testimonials-1920.jpg), [Meet Katty](katty-1920.jpg), [media](media-1920.jpg), [contact](contact-1920.jpg).

Public chapters on wide desktop: [Organisations](organisations-2560.jpg), [What Is Shemotion](guide-2560.jpg).

Screenshots are compressed JPEGs from the local Cloudflare runtime using the existing public event and published media content. Scout artwork is the real published asset, mirrored for local visual checks only. No production content was edited.

## Verification

- Production build passed.
- All **120 tests passed**. [Output](test-results.txt).
- An existing event metadata test used a 20 October 2026 event and expected an upcoming booking offer. That fixture expired before this iteration. Its test clock is now fixed at 1 October 2026, making the existing booking assertion deterministic without changing real event handling.
- Homepage at 320, 375, 390, 430, 768, 1024, 1199, 1200, 1280, 1440, 1600, 1920, 2000, 2080 and 2560px: no document overflow; desktop header links clear the CTA; all three media records render; all step titles and descriptions remain centred; video remains 9:16.
- Baseline geometry for the header, homepage sections and footer is exactly unchanged at 375px and 1024px.
- 36 additional route/viewport checks cover Organisations, the practice guide, events and all three legal pages.
- WCAG 2 A/AA and 2.1 AA audits at 375, 1440 and 2560px returned zero violations. No browser JavaScript errors. [Results](qa-results.json).

## Rollback

Prior production deployment: `110da338-92a4-4504-9661-78bffa93c618`.

Prior production commit: `ee72b0265ef840a5873bbef2caa5ea4b23d3c9b0`.

Cloudflare can roll back to that production deployment. This update requires only a code rollback; no data rollback, podcast withdrawal or schema change is involved.
