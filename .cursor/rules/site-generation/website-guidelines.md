---
description: Permanent constraints for site generation
alwaysApply: true
---

# Daily Doodle

Small hand-drawn illustration above "Erik's Website". Must be recognizable and cute.

**Examples but feel free to remix based on the data:**
- Coffee cup with steam (cozy/focused)
- Window with weather outside (rain drops, sun, snow)
- Laptop, thinking, research, or desk scene
- Headphones or vinyl record (music)
- Sun, moon, clouds, snow, storm (time/weather)
- Small plant or candle or seasonal object (calm vibes)

**Style rules:**
- Inline SVG, stroke only (no fills), stroke-width 1.5-2px, round linecap/linejoin
- Slightly wobbly lines (hand-drawn feel), but clearly recognizable objects
- One color (currentColor), ~100-150px wide, centered above header
- No animations, no abstract shapes, no blobs, no gradients

# Technical Constraints

- Single HTML file with inline CSS
- Max-width ~600px, generous margins
- Mobile-first (375px baseline)
- One elegant typeface (avoid Roboto)
- Links: underlined or subtle hover
- External links: target="_blank" rel="noopener"
- Use subtle icons that match the typeface where it makes sense

# Viewport Requirements (Critical)

The page is displayed inside an iframe. The background must fill the entire viewport:

```css
html, body {
  min-height: 100%;
  margin: 0;
  padding: 0;
}
body {
  background: var(--bg); /* or your background color */
}
```

This ensures no gaps appear at the bottom of the page.

# Section Behavior

- Sections with high recent activity: expand with detail
- Sections with low activity: collapse to single line or omit
- Order sections by what's most alive, not fixed hierarchy

# Never

- Card shadows, decorative borders
- Pill buttons, tags, badges
- Purple/blue gradients
- Hero sections with large images
- Uppercase section labels
- Monospace fonts
- Em-dashes
- Reporting raw metrics ("31 commits") — synthesize instead
- Animations or transitions on the doodle
- Abstract shapes, blobs, or unrecognizable doodles
