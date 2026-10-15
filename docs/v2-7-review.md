# V2.7 site-wide design unification

Base: verified V2.6 `c1c784c3fb7ae30f339f460b08bab9d26d8d1453`, including the event image fit/focal and mobile corrections. Dedicated branch: `codex/editorial-refinement-v2-7`.

## Design decisions

The original public stylesheet had successive V2.1–V2.6 overrides, overlapping heading sizes, local green text, different body scales and superseded layouts. Scattered editorial typography declarations and the historical refinement layers are retired. The shared system in `styles.css` and `docs/design-system.md` now owns the scale, palette, measures and compositions.

The measured V2.6 reference step heading is Marcellus 400 at 28px; the reference FAQ question is Marcellus 400 at 16.96px. Section and page headings now share 24–28px Marcellus 400, supporting headings 22px and editorial paragraphs/FAQ questions 16px. This deliberately uses the existing FAQ family for body text as requested. Inter remains for functional navigation, metadata, labels and controls. No font or dependency is added and no unsupported light weight is simulated.

Two editorial text colours: existing charcoal #4f4a45 and grey #726961. Filled green controls retain contrasting ivory text. Footer and former dark panels now use neutral surfaces. Measured normal-text contrast is 4.83:1 or better on the two neutral surfaces; light text on green is 8.70:1. Publication logos, imagery and the branded video cover remain original assets.

## Homepage and public pages

- Major headings have no redundant eyebrows. Useful women-only positioning is part of the hero paragraph. Other public templates follow the same rule; event classification/audience information remains below the event title and in its facts.
- Homepage surfaces alternate existing ivory #f7f2ec and soft white #fffaf4, without redundant horizontal rules at each transition. Shared wide measure 1120px, reading measure 640px and section spacing 40–64px.
- Events use a heading/link left column and a compact landscape card/rail on the right, stacking on mobile. Existing order, links, booking states, full homepage Afterglow excerpt and saved cover/93%/18% focal settings remain.
- Hero question is natural paragraph text. Hero and Katty imagery share 260×340px desktop / 220×288px mobile display dimensions. First two biography paragraphs remain visible; Read More/Read Less is retained.
- Experience keeps three equal desktop columns, icons, centred steps and fine dividers; mobile stacks. Testimonials use a wide text/video split and centred mobile video; the caption is removed. Actual MP4, poster and user-initiated native playback remain untouched.
- Publication cards stay compact, clickable and responsive with original identities. No unpublished media is added. Organisations invitation, Instagram and footer use the shared text rules.
- Contact uses text left and form right, with gentle neutral fields, subtle borders, ordinary 44px controls, 16px input values, optional consent and a compact submit button. All fields, endpoints, validation and notifications are unchanged.
- FAQ retains content and structured data, starts closed and uses compact rows with rotating SVG chevrons. Existing keyboard, expanded/hidden/inert state and Escape handling remain.
- Archive, event details, organisations, informational and legal routes share the same type and colour system. No route or SEO changes.

## Verification

- `npm test` passes; expanded Node suite passes 120 tests. Production build and whitespace checks pass. Only outdated presentation assertions in the existing tests were updated.
- Chromium checks: 320, 375, 390, 430, 768, 1024 and 1440px. Same heading size per viewport, two text colours with the filled-control exception, alternating surfaces, equal image dimensions, no horizontal overflow, correct saved focal values and full excerpt verified.
- FAQ keyboard/chevron state, coach disclosure, invalid contact validation and user-initiated video playback pass; no browser console/page errors.
- Local fixture checks cover one, two, three and five events/publications at mobile, tablet and desktop, including rail controls/keyboard behaviour. No production records are changed. Touch swipe and end-of-rail control state are checked separately.
- Seven supporting public routes checked at six widths for typography, colours and overflow; representative desktop/mobile screenshots captured. Normal-motion screenshots use natural scrolling and never force reveal visibility.
- Print PDF has three nonblank A4 pages with essential content visible. No-JavaScript and reduced-motion visibility pass.

Native Safari/WebKit is unavailable because this environment lacks its host libraries; checks use Chromium. No valid live contact submission or live admin mutation is performed. Preview retains existing shared data bindings and all live verification stays read-only/invalid-form-only.

## Files changed

`styles.css`, `index.html`, `script.js`, `shared/public-pages.js`, `functions/events/index.js`, `functions/events/[slug].js`, public static entrypoints in `private-groups-retreats`, `what-is-shemotion`, `privacy`, `terms`, `cancellations-refunds`, `test/events.test.js`, `docs/design-system.md` and this review document.

No admin stylesheet/interface, API behaviour, database record, migration, dependency, image/video asset or production setting is changed. Deployment uses the existing justaguyh GitHub-to-Cloudflare Pages Preview integration, project `shemotion`. `main` remains the production branch at `157acb82c41e73440c02fd862550bc35b931804c`.

## Review follow-up: mobile alignment and nested FAQ

Homepage editorial text and CTA groups now centre at mobile widths up to 700px, as does the shared mobile footer. Functional labels, event details and question rows keep their reading alignment. FAQ uses a native section-level details/summary disclosure, initially closed, containing the existing individual question accordions. The section title opens and closes the question list by pointer, Enter or Space, with a rotating chevron; the outer disclosure also works without JavaScript. Closed FAQ height is 96px at 375px and about 100px at 1440px, expanding to the question list only when requested.

120 tests and production build pass. Actual Chromium checks at 320, 375, 390, 430, 768, 1024 and 1440px verify the requested mobile centring, initial collapse, outer keyboard/click toggles, inner question toggles and no overflow. Normal-motion desktop/mobile screenshots capture closed and expanded states. No admin, booking, contact, data or production settings change.
