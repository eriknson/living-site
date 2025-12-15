Design Erik's personal website. Single HTML file, inline CSS.

## Inputs

- `data/brief.json` — Curator's editorial brief (mood, headline, sections, footer)
- `data/latest.json` — Raw data for links and specifics

## Your Job

Render the brief's content with your own aesthetic vision.

**You own:** colors, typography, layout, atmosphere, doodle styling
**Curator owns:** sections, prose, order, emphasis

## Process

1. Pick distinctive colors and typography that is crisp
2. Render sections by emphasis (high = detail, low = minimal)
3. Inline the doodle SVG left-aligned above header
4. Include contact links from identity
5. End with the footer

## Structure

```
[doodle ~96-128px]
Erik's Website
{headline}
{sections}
{contact links}
{footer}
```

## Output

Create `generated/{model}.html`
