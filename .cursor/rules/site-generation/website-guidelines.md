---
description: Design guardrails for site generation
alwaysApply: true
---

# Design Guardrails

These are the constraints and best practices for generating Erik's website.

## Technical Requirements

- Single HTML file with inline CSS
- Max-width ~600px, generous margins
- Mobile-first (375px baseline)
- External links: `target="_blank" rel="noopener"`

### Viewport (Critical)

The page displays in an iframe. The background must fill the entire viewport:

```css
html, body {
  min-height: 100%;
  margin: 0;
  padding: 0;
}
body {
  background: var(--bg);
}
```

## Doodle Integration

Load the SVG from `public/doodles/SVG/{brief.doodle.path}` and inline it:
- Position above "Erik's Website" header
- Size ~80-100px wide
- Use `currentColor` for strokes so it matches the page theme

## Typography

**Choose distinctive fonts.** The typeface sets the entire tone.

Good choices (examples, not exhaustive):
- Newsreader, Lora, Crimson Pro (editorial, warm)
- DM Sans, Plus Jakarta Sans, Outfit (modern, clean)
- Fraunces, Playfair Display (distinctive, characterful)
- Source Serif Pro, Merriweather (readable, classic)

**Never use:**
- Inter, Roboto, Arial, system-ui (generic AI slop)
- Monospace fonts for body text
- Multiple competing typefaces

## Color

**Commit to a cohesive palette.** Dominant colors with sharp accents outperform timid, evenly-distributed palettes.

Good approaches:
- Warm paper tones with a single accent
- Deep background with light text
- Muted earth tones that feel seasonal
- High contrast editorial black/white

**Never use:**
- Purple/blue gradients on white (clichéd AI aesthetic)
- Neon accents without purpose
- Gray-on-gray low contrast
- Rainbow or too many colors

## Visual Atmosphere

**Create depth and character**, not flat solid backgrounds.

Consider:
- Subtle CSS gradients (linear, radial)
- Very light texture patterns
- Contextual effects that match the mood
- Seasonal or time-of-day appropriate atmosphere

**Never use:**
- Shadows on text
- Card shadows or decorative borders
- Hero sections with large images
- Pill buttons, tags, or badges

## Layout

- Sections ordered by the brief's section order (highest emphasis first)
- High emphasis sections: expand with detail
- Low emphasis sections: single line or omit
- No uppercase section labels
- Links: underlined or subtle hover states
- Subtle icons where they add meaning

## Content Rendering

The brief contains the actual prose. Your job is to render it beautifully.

- Don't rewrite the curator's content
- Don't add sections not in the brief
- Don't report raw metrics — the curator already synthesized them
- Em-dashes are forbidden

## Quality Checklist

Before outputting, verify:
- [ ] Font is distinctive (not Inter/Roboto/Arial)
- [ ] Color palette has character
- [ ] Background has atmosphere (not flat white/gray)
- [ ] Doodle is inlined with currentColor
- [ ] Sections follow brief's order and emphasis
- [ ] Mobile scrolling works (no fixed positioning traps)
- [ ] Links have hover states
- [ ] Footer includes the brief's closing thought
