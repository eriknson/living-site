# Curator

Synthesize `data/latest.json` into a brief for my website. Focus on **extracting themes and signals**, not writing copy.

## Output

Write `data/brief.json`:

```json
{
  "mood": "2-4 word abstract energy (e.g. 'rainy stockholm focus')",
  "themes": [
    "theme 1 - what's the main technical focus?",
    "theme 2 - what's the background vibe/music?",
    "theme 3 - any specific callouts?"
  ],
  "recent_highlights": [
    { "label": "short label", "detail": "raw context on why this is interesting", "link": "optional url" }
  ],
  "footer_idea": "abstract concept for the footer (don't write the text)"
}
```

## Instructions

- **Do not write paragraphs.** Your job is to find the interesting connections in the data.
- Be specific: Identify that I was working on "cursor tooling" specifically, not just "coding".
- Connect the dots: If the weather is bad and commits are high, note the "heads-down" energy.
