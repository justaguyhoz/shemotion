# Shemotion public design system — V2.7

This is the current source of truth. Historical V2.1–V2.6 typography/layout overrides have been consolidated into the public design-system section of `styles.css`; admin has separate stylesheets.

## Typography

The actual V2.6 reference step heading measured Marcellus 400 at 28px. The reference FAQ question measured Marcellus 400 at 16.96px. Existing Google Fonts definitions supply Marcellus 400 and Inter 400/500/600. No family or synthetic light weight is added.

| Role | Family / weight | Size / line height |
| --- | --- | --- |
| Page and section headings | Marcellus 400 | 24–28px / 1.3 |
| Step and supporting headings | Marcellus 400 | 22px / 1.3 |
| Editorial paragraphs and FAQ questions | Marcellus 400 | 16px / 1.65 (questions 1.5) |
| Navigation, labels and metadata | Inter 400 | 14px / 1.5 |
| Buttons, compact labels and links | Inter 400/500 | 12px / 1.5 |
| Form input values | Inter 400 | 16px / 1.5 |

The body switches from Inter to the existing Marcellus family to match Katty’s explicitly requested FAQ reference. Functional controls retain Inter. Semantic h1/h2/h3 hierarchy is preserved despite the restrained visual scale. Headings balance wrapping; paragraphs use pretty wrapping.

## Colours and surfaces

Exactly two editorial text tokens: `--text-heading` = existing charcoal #4f4a45 and `--text-body` = existing grey #726961. The only light-text exception is a filled green control. Green remains available for borders, icons, focus indicators and button backgrounds. Footer and former dark editorial panels now use warm neutral surfaces so body text needs no extra colours.

Homepage sections alternate existing ivory #f7f2ec and soft white #fffaf4. No extra divider is placed at every colour transition. Fine rules remain inside the steps, FAQ and selected components.

## Measures and rhythm

`--content-wide`: 1120px; `--content-reading`: 640px; section padding 40–64px; gutters 20–64px. Shared spacing scale remains 8, 12, 16, 24, 32 and 40px. Heading-to-copy gap 16px; text-to-action 24px.

Desktop events, hero, testimonial, biography and contact use balanced horizontal compositions. At mobile widths they stack naturally. Hero and biography images share 260×340px desktop and 220×288px mobile displays. Testimonial is 204px wide on desktop and up to 220px on mobile, with its original 9:16 footage and poster.

Event rails remain scrollable within the right content column; card fit and focal values come from saved records. The homepage-only Afterglow excerpt remains complete. Publication identities retain natural aspect ratios. Form values retain 16px text and ordinary controls retain at least 44px targets; checkboxes retain their visible labels and touch row.

## Accessibility and verification

FAQ buttons retain native keyboard activation, aria-expanded/aria-controls, hidden/inert answers and a rotating SVG chevron. All start collapsed. Coach disclosure and native video controls remain. Reduced motion, no-JavaScript visibility and print rules remain supported. Visually review 320, 375, 390, 430, 768, 1024 and 1440px and verify there is no horizontal page overflow. Never force reveal styles visible when generating review screenshots.

## V2.7 review corrections

At mobile widths up to 700px, homepage editorial headings, paragraphs, CTA groups and the shared footer align centrally. Form labels, field values, event details and accordion questions keep their functional reading alignment. FAQ now uses a native, initially closed section disclosure, with the existing individual question accordions nested inside it. Its closed title row is compact on both desktop and mobile, and its chevron reflects the native open state. No JavaScript is needed to open the outer disclosure.
