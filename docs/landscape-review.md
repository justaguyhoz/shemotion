# V2.3 short-landscape correction

Baseline: `c13f251f989ca8f10abf2e02c9779e6a72193c5b`.

The supplied landscape-phone screenshots showed the portrait layout on a wide,
short viewport. Width-only breakpoints stacked the hero, biography and experience,
while the sticky header consumed about 82px. The open menu could exceed the visible
height. These are responsive corrections to the approved V2.3 composition.

For landscape viewports 568–1100px wide and at most 500px high:

- The sticky header is 61px tall, with opaque existing cream and 44px controls.
- Hero and Katty content use side-by-side layouts with restrained portraits.
- Related section padding is 32px. Fonts, wording and methodology are unchanged.
- At 740px and wider, the three experience columns use their existing desktop
  arrangement and fine vertical rules. Narrower landscape phones retain a stack
  for readable text measures.

The mobile menu is bounded by `100dvh` minus measured header height, with its own
vertical scrolling. A ResizeObserver updates both the menu-height variable and
anchor offset after rotation. Portrait and normal-height desktop/tablet rules are
unchanged. Events, contact, Times logo, booking logic and backend are untouched.
Public markup edits are CSS cache revisions only.

Verification: production build, `npm test`, and the expanded 119-test suite pass.
An added regression test checks header/menu offsets after resizing. Mobile browser
checks cover 568×320, 667×375, 740×333, 812×375, 844×390, 896×414, 932×430,
1024×500, 375×812, 390×844, 430×932, 768×1024, 1024×768 and 1440×900.
No overflow or script errors were found. Anchor targets clear the header; menu
links/social controls remain reachable; Escape restores focus. Rotation with the
menu open passes without a reload. Actual viewport and section screenshots show
hero, experience, biography and menu in landscape, alongside portrait/desktop
regressions.

Browser verification uses Chromium mobile emulation. The WebKit engine was
obtained as temporary tooling outside the repository, but cannot run here because
required host libraries are absent. No application dependencies were added and
no Safari-on-device result is claimed. Actual iPhone browser chrome/safe-area
behaviour should be confirmed on the updated preview.

Changes remain on the V2.3 review branch. Production and all data bindings stay
unchanged. No production/admin/media/form writes were performed.
