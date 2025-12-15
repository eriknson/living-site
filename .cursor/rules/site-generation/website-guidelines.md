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
- ~80-100px wide, above header
- Use `currentColor` for strokes

## Typography

**Use distinctive fonts:** Newsreader, Lora, Fraunces, DM Sans, Plus Jakarta Sans, Source Serif Pro

**Never:** Inter, Roboto, Arial, system-ui, monospace for body

## Color

Commit to a cohesive palette. Dominant colors with sharp accents.

**Never:** purple/blue gradients on white, neon without purpose, low contrast gray-on-gray

## Atmosphere

Create depth: subtle gradients, light textures, seasonal effects.

**Never:** text shadows, card shadows, decorative borders, pill buttons, badges

## Layout

- Sections ordered by brief (high emphasis first)
- No uppercase labels
- Links: underlined or subtle hover

## Content

Render the brief's prose. Don't rewrite it. Don't add sections. No em-dashes.
