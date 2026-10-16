# Concept 5 — Katty photos and Spotify podcast

Status: uncommitted review build. Base commit: `53a52a0004593e44fbb3c17a2c585db50e7a5e86` on `codex/concept5-editorial-refinement`. No new Git commit, push, production deployment or production data update has been made.

Preview: https://6a183746.shemotion.pages.dev/

Accessible screenshot review: https://6a183746.shemotion.pages.dev/design-review/

## Changes

- Use the supplied 1280 × 720 studio landscape in Come Home, replacing the generated four-woman image.
- Use the supplied 1024 × 1280 cream-dress portrait of Katty in the small offset frame. Original files are converted to lightweight WebP without changing their contents; responsive framing is handled by CSS. The existing Meet Katty portrait is unchanged.
- Add the user-approved Spotify episode alongside the existing Times article, using the existing media renderer, official episode artwork and verified Spotify oEmbed title: **Your Body Is Not a Performance: Feminine Embodiment, Movement & Self-Trust**.
- Link directly to https://open.spotify.com/episode/6fjAUemp1Evoz40N13fkbx. No autoplay or embedded third-party player is added.
- Present the long podcast subtitle in compact body typography while retaining its full real title and accessible link label. Two media cards adapt to desktop/tablet and stack on mobile.

## Preview and publication controls

The review deployment is built from the uncommitted working tree. Its homepage media section is pre-rendered from the two approved records using the same existing renderer. This review-only snapshot allows the podcast to be inspected without writing to the production database. The source homepage retains its live media placeholder and normal admin-controlled publication model.

The idempotent content import is prepared at `scripts/content/2026-10-16-katty-podcast.sql`. It was applied only to the local development database, twice, with one resulting podcast record. **Do not apply it remotely or deploy to production until the user approves.** After approval, the normal production build and this content import make the podcast a regular media record controlled by the existing administration. No backend schema change is needed.

## Screenshots

| View | Desktop | Mobile |
| --- | --- | --- |
| Full homepage | [1440px](homepage-1440.jpg) | [375px](homepage-375.jpg) |
| Supplied Katty photos | [1440px](come-home-1440.jpg) | [375px](come-home-375.jpg) |
| Media and podcast | [1440px](media-1440.jpg) | [375px](media-375.jpg) |

Tablet photo checks: [768px](come-home-768.jpg), [1024px](come-home-1024.jpg). Tablet media checks: [768px](media-768.jpg), [1024px](media-1024.jpg).

## Verification

- `npm test`: all 13 test-file reports passed. [Test output](test-results.txt).
- `npm run build`: passed. Existing Pages Functions bundle compiled successfully.
- Chromium at 320, 375, 390, 430, 768, 1024, 1440 and 1920px: both photos load, correct Spotify destination and accessible link label, no document horizontal overflow or JavaScript errors. Existing contact fields/consent and closed FAQ remain; testimonial video retains 9:16.
- WCAG 2 A/AA and 2.1 AA axe audits at 375px and 1440px: zero violations. [Results](qa-results.json).
- Screenshots in this folder were captured from the local Cloudflare runtime with the same staged media snapshot deployed for review.

The pending production publication step is intentional. No valid live form submissions, bookings, admin changes, emails or production database writes were performed.
