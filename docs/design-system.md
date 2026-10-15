# Shemotion public design system — V3

V3 follows the approved cream/blush editorial paper-collage reference. `v3.css` is the public presentation layer after `styles.css`; the latter retains the existing functional component foundation. Admin uses its own unchanged stylesheets. No public route or data source is replaced.

| Token | Colour | Use |
| --- | --- | --- |
| `--ivory` | #f8f0e6 | Main paper, light text |
| `--cream` | #f2e6d8 | Secondary paper surfaces |
| `--white-soft` | #fcf7ef | Lightest cards |
| `--blush` | #ead0c5 | Events, supporting panels |
| `--rose` | #c59489 | Dusty floral/art accents |
| `--sand` | #dfc9b5 | Offset frames |
| `--taupe` | #9b8171 | Warm secondary accents |
| `--chocolate` | #4b3126 | Testimonial band, deeper panel text |
| `--charcoal` | #38281f | Primary editorial text |
| `--muted` | #655044 | Supporting body text |
| `--green` | #4e5b3b | Muted olive CTAs |

## Typography

Three self-hosted, open-license roles: Cormorant Garamond 400/500 and true italics for editorial headings; Inter 400/500/600 for body and functional controls; Caveat 400 for decorative handwritten notes only. Subset WOFF files and their OFL licenses live in `assets/fonts/`. Public pages make no third-party font requests. Functional input values stay 16px. Main hero is 60–92px desktop, 58–86px mobile; section headings generally 32–48px; body is compact 12–14px. Short headings balance and paragraphs use pretty wrapping. Preserve semantic heading levels independently of visual size.

## Layout and spacing

The wide measure is 1160px; existing shared spacing tokens remain 8, 12, 16, 24, 32 and 40px. Related heading/copy/action gaps are generally 10–16px. Homepage section spacing is generally 26–40px, with explicit optical positioning for collage images and torn-paper overlaps. These placements intentionally differ from standard document flow to reproduce the reference. They are not a second arbitrary paragraph spacing scale.

The hero pairs a large left headline with an expansive torn photograph. The second section combines a distinct back-to-camera image, a small smiling close-up, a handwritten paper note and compact copy. Stages form three desktop columns and compact mobile icon/text rows. Events are data-driven horizontal bands without artwork. The dark testimonial band contains real 9:16 footage; the framed player extends outside the panel. Katty retains her original studio photograph, cropped using CSS to focus on her. Media cards retain approved identities only. Instagram precedes Contact, followed by the closed FAQ and footer.

## Decorations and motion

Reusable irregular CSS paper clips, two small SVGs (paper grain and sun), offset photo frames, soft shadows and two different transparent botanical artworks. The generated movement photos are illustrative brand imagery, not claims of real participants or events. They never replace Katty or the Tallai video.

Flowers sway by roughly two degrees and three pixels over 9–11 seconds using CSS individual transforms. The footer offers Pause/Resume floral motion, with local preference persistence. Reduced motion disables it completely. Entrance animation and the automatic Instagram marquee are removed; the real Instagram snapshot remains manually scrollable. Decorative art is excluded from the accessibility tree.

## Public routes and accessibility

The events archive/details, organisations, guide and legal pages share fonts, paper colours and CTA treatments. Event images and saved framing remain on event pages. Homepage cards omit them. Real booking states, data ordering, media publication controls, form fields/consent, APIs, tracking, SEO and admin interfaces remain intact. The primary Explore action retains the existing `BookNowClick` tracking event and remains available when the event list is empty.

Keyboard navigation, native user-initiated video controls, FAQ/disclosure semantics, validation/status handling and reduced-motion support remain. See `docs/v3-review.md` and `review/*.json` for measured browser and accessibility results.
