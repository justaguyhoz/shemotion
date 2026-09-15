# Shemotion implementation guidance

## Mobile visual quality

- Visually inspect public-page changes before completion. Automated tests and Lighthouse do not replace visual QA.
- Check approximately 320px, 375px, 390px, 430px and a representative tablet width.
- Mobile layouts should feel compact and intentional, without excessive vertical whitespace, clipping or horizontal overflow.
- Avoid isolated final words in headings, eyebrows, short introductions and CTA labels.
- Use `text-wrap: balance` for headings and short display text where appropriate, and `text-wrap: pretty` for paragraphs where appropriate.
- Keep meaningful phrases such as "Gold Coast", "Shemotion Experience", "Movement Meditation" and "Feminine Movement Meditation" together where practical.
- Deliberate responsive line breaks are allowed only when they create an intentional composition. Do not add arbitrary `<br>` elements to repair one viewport.

## Spacing system

- Prefer the shared spacing tokens in `styles.css` over arbitrary margin and padding values.
- Equivalent content relationships must use equivalent spacing unless there is a documented design reason for an exception.
- Preserve hierarchy while keeping related mobile text, media and actions visually connected.
- See `docs/design-system.md` for the spacing scale and default mobile relationships.
