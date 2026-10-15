# V2.4 review

Based on V2.3 `1e73de04e403439d6f8216f7476eb6b0bd449f35`, including the latest mobile centring, landscape navigation and editorial spacing corrections.

## Focused changes

- Homepage event previews: 460px desktop width, 40:60 image/content columns, smaller image area, two-line description, compact date presentation, fine border, soft shadow and 2px hover lift. Single cards remain centred; two fit side by side where space permits; additional cards retain the existing rail controls. Full artwork uses contain without hover zoom, preserving the original poster rather than cropping its lettering. Saved focal settings and archive/detail rendering remain intact.
- Testimonial introduction and caption use the requested plural wording. Original footage, branded cover, user-initiated playback and native controls remain unchanged.
- Clickable media cards frame the publication logo beside its article title. Four or more use a balanced grid. The original official Times PNG is unchanged; multiply blending and a deliberate cream inset frame remove its accidental white rectangle. No replacement branding was drawn or fabricated.
- Quiet shadows on selected homepage images; short hover transitions on cards, with no hover elevation or transition under reduced motion. No new reveal dependency or hidden essential content.
- Public stylesheet cache revision updated across static and generated public pages. Admin and backend code are unchanged.

## Verification

- Production build passes; full expanded Node test suite: 119 passed, zero failures.
- Browser fixtures: one, two, three and five events/media features. No production records were changed.
- Chromium screenshots and measurements at 320, 375, 390, 430, 768, 1024 and 1440px plus 844x390 landscape. No page overflow; form and video centring retained. Desktop form remains 600px and mobile 375px form remains 303px.
- Carousel arrows, keyboard navigation, mobile touch swipe, end-of-rail disabled state, sticky anchor clearance, mobile menu Escape/focus restoration, native video playback, media keyboard focus and invalid contact validation pass.
- Supporting public routes checked for overflow at 320, 430, 1024 and 1920px.
- Browser QA uses Chromium; native Safari/WebKit is unavailable because the environment lacks its host libraries. Contact delivery is covered by the existing tests; no valid live submission is sent.

## Preview workflow

The connected Cloudflare project is `shemotion`, linked to `justaguyhoz/shemotion`, with production branch `main` and previews enabled for development branches. Publishing the dedicated V2.4 branch triggers its review-only Preview. Production remains on `157acb82c41e73440c02fd862550bc35b931804c`. No settings or bindings are changed. Existing Preview database/storage bindings are shared, so live QA remains read-only and invalid-form-only. See `cloudflare-preview-workflow.md` for the established workflow.

## Testimonial visibility correction

Normal-motion review found a legacy reveal selector hiding the testimonial heading while JavaScript revealed its parent only. Earlier screenshots forced reveal visibility and therefore masked this bug. The nested heading hide selector and testimonial parent reveal dependency are removed: title, introduction, cover and caption remain visible without animation. Corrected evidence is captured with normal motion, natural scrolling and no forced visibility styles.
