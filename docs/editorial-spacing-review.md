# V2.3 centred form and editorial spacing

Baseline: `802b09dc9eecc31c01e0f0917a4b4eb200586f4e`.

The homepage now leaves a clearer pause between its fine dividers and major
content groups: 56–88px section padding, with 40px on short landscape phones.
The opening retains a more compact 32–56px rhythm. The relationship gaps within
forms and text groups remain compact instead of expanding every gap uniformly.

The contact heading remains centred on the shared reading measure. The form is
independently centred and capped at 600px, with an additional 16px inset on each
side on narrow viewports. At 375px the form is 303px wide; at 390px it is 318px.
Short fields use two balanced columns when space permits, and a single column
on phones. Input text stays 16px, controls at least 44px, and the textarea stays
80px and resizable. Validation, consent and delivery code are unchanged.

Mobile experience text uses a centred 30ch reading measure. Stacked step dividers
have 40px above/below, and the group begins 40px below the introduction. Existing
fonts, colours, artwork and methodology remain intact. Landscape columns and
navigation corrections remain available.

Verification: `npm test`, the expanded 119-test suite, production build and
`git diff --check` pass. Actual browser layout checks cover 320×740, 375×812,
390×844, 430×932, 768×1024, 1440×900, 1920×1080, 667×375, 844×390 and 932×430.
The form and its heading have equal left/right positioning, no page overflow or
browser script errors, and unchanged readable/touch dimensions. Contact and
experience anchors clear the sticky header. Invalid form submission stays blocked.
Screenshots include contact, experience, testimonial and media at representative
portrait, landscape, tablet and desktop ratios, plus full portrait/desktop pages.

Testing uses Chromium mobile emulation; Safari browser chrome remains an on-device
review limitation. Only public presentation and CSS cache revisions changed.
No backend, admin, database, booking or tracking code changed. Publish only to the
existing development Preview; production and main remain untouched.
