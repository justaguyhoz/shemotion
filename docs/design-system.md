# Shemotion design system

## Mobile spacing scale

The public site uses these CSS custom properties:

| Token | Value |
| --- | ---: |
| `--space-xs` | 8px |
| `--space-sm` | 12px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 32px |
| `--space-2xl` | 40px |
| `--space-section` | 64px |

Relationship aliases keep equivalent content gaps tied to that scale:

| Token | Relationship | Value |
| --- | --- | ---: |
| `--space-label-heading` | Eyebrow or label to heading | 12px |
| `--space-heading-body` | Major heading to introductory copy | 16px |
| `--space-subheading-body` | Minor heading or lead to body copy | 12px |
| `--space-body-action` | Body copy to CTA | 24px |
| `--space-content-group` | Related content groups | 32px |

Heading measures use `--heading-measure-compact` (13ch) and
`--heading-measure-standard` (18ch). Apply them by heading type rather than to
every heading globally.

Use the scale deliberately rather than mechanically replacing every numeric value. Preserve intentional desktop and component-specific exceptions.

## Editorial layout

The public pages extend the existing scale with two shared content measures:

- `--content-wide` (1180px) for event rows, forms and editorial grids.
- `--content-reading` (660px) for introductions and focused reading copy.

Major homepage sections use `--editorial-divider`, a quiet clay-tinted rule that
separates content without creating card-like containers. Desktop editorial grids
may use two or three columns, but collapse into comfortable single-column reading
flows rather than shrinking content into narrow columns.

Public display headings use one shared proportional scale, capped below the older
oversized hero treatment. Homepage and archive event artwork uses a compact 16:10 frame; event details
retain their 4:3 frame. Both preserve the saved fit and focal-point data. Logo-led media artwork always uses `object-fit: contain` so publication marks
are not cropped or distorted.

## Default mobile relationships

- Eyebrow to major heading: 12px
- Major heading to lead or subheading: 16px
- Lead or subheading to body copy: 16px
- Paragraph to paragraph: 12px
- Body copy to supporting note: 16px
- Text group to CTA: 24px
- CTA to CTA: 12px
- Section introduction to image or content: 32px
- Image to step number: 24px
- Step number to step heading: 12px
- Step heading to paragraph: 16px
- Content block to the next major block: 40px
- Major section to major section: 64px

Equivalent relationships should use equivalent spacing throughout the public site. These are defaults, not a requirement to flatten hierarchy.

## Typography and wrapping

- Use `text-wrap: balance` for headings, eyebrows, short introductions and CTA labels where it improves composition.
- Use `text-wrap: pretty` for normal paragraphs where supported.
- Avoid isolated final words and keep meaningful phrases such as "Gold Coast" together where practical.
- Prefer container width, max-width, font size, line-height, letter spacing and wrapping rules over device-specific fixes.
- Deliberate responsive line breaks are acceptable only for intentional compositions. Never add arbitrary `<br>` elements to repair a single viewport.
- The Approach hero keeps “Movement Meditation?” together on narrow screens only. On wider layouts it may wrap so the text cannot overlap the portrait column.

## Required visual QA

For public-page presentation changes, inspect the homepage, events listing, a representative event page, private groups page and The Approach page. Check approximately 320px, 375px, 390px, 430px and a representative tablet width, plus a desktop regression pass.

Review heading and eyebrow wrapping, short copy, buttons, CTA and image spacing, content density, alignment, clipping, horizontal overflow and browser console errors. Record any remaining awkward wrap instead of declaring the work complete.


## V2.1 public typography and proportions

The existing brand families are retained. Google Fonts supplies Marcellus at 400
only, and Inter at 400, 500 and 600. No synthetic 300 weight or extra font is used.
Display headings remain Marcellus 400; body and labels are Inter 400, with 500 for
buttons. The local SVG testimonial poster uses the existing Georgia fallback so
it does not request a font of its own.

| Token | Responsive value |
| --- | --- |
| `--type-display` | 37.6–56px, for hero and page titles |
| `--type-section` | 30.4–42px |
| `--type-support` | 22.4–28px |
| `--type-body` | 16px, 1.65 default line height |
| `--type-eyebrow` | 11.52px, regular weight |
| `--event-card-width` | 320px, contained by narrow mobile viewports |

Public section padding is generally 44–64px. The contact form is capped at 900px,
uses four desktop columns, two tablet columns and one mobile column. Inputs retain
44px targets and 16px text; the message field starts at 96px and remains resizable.
The submit button sizes to its content. Consent remains optional and visible.

Experience columns centre their icons, numbers, headings and copy. Icons are 76px
on desktop and 58px on phones; numbers are 23.2px, about 37% smaller than V2.
Vertical desktop dividers become horizontal mobile dividers.

The testimonial player is capped at 280px wide, centred, 9:16 and uncropped. A
local cream/blush SVG poster provides the initial cover; playback requires a user
action and retains native controls. The original MP4 and JPEG poster remain intact.

Event rails shrink to one or two cards when appropriate, show three desktop cards,
and scroll for additional cards. Controls appear only when content overflows.
The preview description is limited to three lines; the full description, dates,
times, location, price and booking state remain on the linked detail page.

Media uses 280px publication tiles for one to three entries and an even three-column
grid for four or more, becoming two and then one column. The known unapproved Times
fallback thumbnail is represented by its publication name. Stored media data and
publication state are unchanged; future approved uploads use the image treatment.
