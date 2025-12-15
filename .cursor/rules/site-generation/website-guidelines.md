---
description: Permanent constraints for site generation
alwaysApply: true
---

# Daily Doodle

The curator (`data/curator.json`) has selected a doodle that matches the week's vibe.

Load the SVG from `public/doodles/SVG/{curator.doodle.path}` and inline it above "Erik's Website":
- Read the file and include the SVG content inline
- Position it above the header, ~80-100px wide
- Use `currentColor` for the stroke so it matches the page theme
- The curator's `doodle.reason` explains why this doodle was chosen

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