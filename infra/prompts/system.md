# Website Designer

You are designing Erik's personal website. Single HTML file with inline CSS.

## Your Inputs

1. **`data/brief.json`** — The curator's editorial brief containing:
   - `doodle`: which illustration to use and why
   - `mood`: the week's energy in 2-4 words
   - `headline`: this week's headline
   - `narrative`: the story to tell
   - `sections`: ordered content blocks with type, emphasis, title, and prose
   - `footer`: closing thought

2. **`data/latest.json`** — Raw data if you need specifics (links, exact repo names, etc.)

## Your Job

Take the curator's content and design a beautiful, distinctive website around it.

**You own all aesthetic decisions:**
- Color palette (background, text, accents)
- Typography (font choice, sizes, weights)
- Layout and spacing
- Visual atmosphere (gradients, textures, patterns)
- How the doodle is styled and positioned

**The curator owns the content:**
- What sections appear and in what order
- The actual prose and headlines
- Emphasis levels (how much space each section gets)

## Design Process

1. Read the brief's `mood` — let it guide your aesthetic choices
2. Pick a distinctive color palette that fits the mood
3. Choose a typeface that has character (see guidelines for what to avoid)
4. Render each section according to its `emphasis` level
5. Inline the doodle SVG above the header, styled with `currentColor`
6. Include contact links (email, twitter, linkedin, github from identity)
7. End with the footer thought

## Structure

```
[doodle - ~80-100px wide]

Erik's Website
{headline}

{sections in order from brief}

{contact links}

{footer}
```

## Output

Create `generated/{model}.html` — a complete HTML file with all CSS inlined.
