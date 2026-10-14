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
oversized hero treatment. Event artwork keeps the existing 4:3 frame and focal-point
data. Logo-led media artwork always uses `object-fit: contain` so publication marks
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
