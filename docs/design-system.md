# Shemotion public design system — Concept 5 refinement

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

Three self-hosted, open-license roles: Cormorant Garamond 400/500 and true italics for editorial headings; Inter 400/500/600 for body and functional controls; Caveat 400 for decorative handwritten notes only. Subset WOFF files and their OFL licenses live in `assets/fonts/`. Public pages make no third-party font requests. Functional input values stay 16px. Main hero is 60–92px on smaller desktops and 84–112px on wide desktops, 58–86px mobile. Wide desktop section headings generally use 42–56px and body copy 15–17px; existing mobile and tablet typography remains unchanged. Short headings balance and paragraphs use pretty wrapping. Preserve semantic heading levels independently of visual size.

## Layout and spacing

The content measure is 1160px below the wide-desktop breakpoint. From 1200px viewport width, a shared frame grows from 1440px towards a 1600px maximum, limited by the existing side gutters. Header, homepage sections, internal chapter frames and footer follow this same measure. Existing shared spacing tokens remain 8, 12, 16, 24, 32 and 40px. Related heading/copy/action gaps are generally 10–16px. Homepage section spacing is generally 26–40px, with explicit optical positioning for collage images and torn-paper overlaps. These placements intentionally differ from standard document flow to reproduce the reference. They are not a second arbitrary paragraph spacing scale.

The hero pairs a large left headline with an expansive torn photograph. The second section combines the supplied studio landscape, a small cream-dress portrait of Katty, a handwritten paper note and compact copy. Stages form three desktop columns and compact mobile icon/text rows. Events are data-driven horizontal bands without artwork. The dark testimonial band contains real 9:16 footage; the framed player extends outside the panel. Katty retains her original studio photograph, cropped using CSS to focus on her. Media cards retain approved identities only. Instagram precedes Contact, followed by the closed FAQ and a compact three-part footer.

## Decorations and motion

Reusable irregular CSS paper clips, two small SVGs (paper grain and sun), offset photo frames, soft shadows and two different transparent botanical artworks. The generated movement photos are illustrative brand imagery, not claims of real participants or events. They never replace Katty or the Tallai video.

Flowers sway by roughly two degrees and three pixels over 9–11 seconds using CSS individual transforms. The footer offers Pause/Resume floral motion, with local preference persistence. Reduced motion disables it completely. Entrance animation remains removed. The real Instagram snapshot moves at approximately 18px/second on a native scroll surface. Two equal cycles make the loop seamless; hover, focus, touch and drag pause it. A dedicated pause/resume control and reduced-motion preference disable automatic movement, while keyboard, native touch and mouse drag remain available. Decorative art is excluded from the accessibility tree.

## Public routes and accessibility

The events archive/details, organisations, guide and legal pages share fonts, paper colours and CTA treatments. Event images and saved framing remain on event pages. Homepage cards omit them. Real booking states, data ordering, media publication controls, form fields/consent, APIs, tracking, SEO and admin interfaces remain intact. The primary Explore action retains the existing `BookNowClick` tracking event and remains available when the event list is empty.

Keyboard navigation, native user-initiated video controls, FAQ/disclosure semantics, validation/status handling and reduced-motion support remain. See `docs/v3-review.md` and `review/*.json` for measured browser and accessibility results.

## Concept 5 refinement

The existing typography, palette, paper clips and photographic grading remain the visual authority. The header CTA now uses inline flex centring. The homepage experience and testimonial sections begin directly with their main headings; supporting copy carries useful information rather than repeated labels. The hero handwriting sits on a small paper surface clear of the flower.

Homepage events use an offset warm paper surface, a decorative date illustration, concise real metadata and the existing booking presentation. The date illustration is aria-hidden because the full date is retained in normal reading order. The mobile text spans the full paper width below the title/date, keeping the band compact. Multi-event browsing retains native scroll and existing keyboard controls.

Organisations is a short commercial chapter with four settings, regional information and enquiry pathways. The practice guide uses four numbered explanations, a concise aside, first-session information and the original five questions. Each has a fresh dedicated concept image; neither duplicates the homepage primary photographs. Katty's authentic portrait is unchanged. Selected flowers can cross section boundaries; only intentional viewport-edge photo bleed is clipped horizontally.

Current review handover: `docs/design-reviews/concept5-refinement/README.md`. Screenshots and QA evidence live on the development branch, with direct GitHub links for review outside the workspace.

## Headline alignment and media paper follow-up

Homepage section headings share the left edge of their supporting copy, following the Come Home composition on mobile and desktop. Explicit margin resets prevent legacy responsive centring from insetting narrower headlines. Experience step headings and copy are centred within each step on mobile and desktop. The media band uses the existing blush token and paper grain on a separate decorative layer with uneven upper and lower tears; its real publication cards and links remain unclipped.

The approved production mobile footer uses left-aligned brand copy, equal legal/navigation columns, and a distinct social/motion-control row above stacked copyright and ABN details. The existing destinations, business details and reduced-motion control are retained.

## Wide desktop proportions

From 1200px, content, imagery and type scale together. At 1920px the main frame is 1440px (240px side margins); at 2560px it is 1600px (480px side margins). Nested 940px/960px caps are removed from Meet Katty and the organisations invitation. Paragraphs keep reading measures rather than filling the entire screen. Selected flowers and side social links use the content-frame edge; torn-paper bands and backgrounds remain full bleed. The three published media features can share a single row. All changes are inside screen-only desktop media queries, preserving mobile/tablet geometry and print styling.
