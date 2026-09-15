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

Use the scale deliberately rather than mechanically replacing every numeric value. Preserve intentional desktop and component-specific exceptions.

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

## Required visual QA

For public-page presentation changes, inspect the homepage, events listing, a representative event page, private groups page and The Approach page. Check approximately 320px, 375px, 390px, 430px and a representative tablet width, plus a desktop regression pass.

Review heading and eyebrow wrapping, short copy, buttons, CTA and image spacing, content density, alignment, clipping, horizontal overflow and browser console errors. Record any remaining awkward wrap instead of declaring the work complete.
