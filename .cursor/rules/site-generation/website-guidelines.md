---
description: Design guardrails for site generation
alwaysApply: true
---

# Design Guardrails

## Technical

- Single HTML, inline CSS, max-width ~600px
- Mobile-first (375px baseline)
- External links: `target="_blank" rel="noopener"`

### Viewport (Critical)

Page displays in iframe. Background must fill viewport:

```css
html, body { min-height: 100%; margin: 0; padding: 0; }
```

## Doodle

Inline SVG from `public/doodles/SVG/{brief.doodle.path}`:
- ~96-128px wide, left-aligned above header

## Layout

- Sections ordered by brief (high emphasis first)
- No uppercase labels
- Links: underlined or subtle hover

## Content

Render the brief's prose. Don't rewrite it. Don't add sections.

## Avoid / Never use

- em dashes, phrasings that feel AI slop or generated
- purple/blue gradients, neon without purpose
- text shadows, card shadows, decorative borders, pill buttons, badges
