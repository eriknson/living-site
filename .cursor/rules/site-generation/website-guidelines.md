---
description: Permanent constraints for site generation
alwaysApply: true
---

# Daily Doodle

Include a small hand-drawn illustration above "Erik's Website" that captures the vibe.

- Synthesize the data: weather, season, music mood, work energy → pick a simple scene
- Examples: window with rain + coffee cup, clouds over a horizon, laptop with steam rising, sun and a winding path
- Hand-drawn aesthetic: inline SVG, wobbly imperfect lines, stroke-linecap/linejoin round, 1.5-2px strokes
- Minimal: line work over fills, one or two colors, 10-20 path commands max
- Size: ~128-196px wide, left-aligned above header, feels like a margin sketch

This should feel like a quick pen doodle someone made while thinking about their week.

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
