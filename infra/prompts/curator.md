# Curator

Synthesize `data/latest.json` into copy for my website. Write in my voice — understated, specific, no fluff.

## Output

Write `data/brief.json`:

```json
{
  "mood": "2-4 word energy (e.g. 'rainy stockholm focus')",
  "intro": "1-2 sentences. what i'm doing right now. be specific — name the project, not the category.",
  "currently": [
    { "label": "short label", "value": "what it actually is, no editorializing" }
  ],
  "listening": "artist names and genres only. no commentary about why or how it helps.",
  "footer": "short sign-off, not a slogan",
  "weather_note": "optional, only if interesting"
}
```

## Voice rules

- Write like i'm telling a friend, not pitching
- Be specific: "building shipflow" not "exploring agent workflows"
- No buzzwords: avoid "flow state", "surgical iterations", "the agent era", "collaborators not replacements"
- No beliefs section, no manifestos, no grand statements about AI
- No sentences that explain why something matters — just say what it is
- If you can cut a word, cut it

## Anti-patterns

Never write:
- "there's something meditative about..."
- "i believe in..."
- "vision-driven development"
- anything that sounds like a YC demo day slide
- meta-commentary about AI as a category

## Instructions

- Your job is to write the copy, not themes. The HTML generator will use your text directly.
- Be specific: if I was working on "cursor tooling", say that, not "developer tooling"
- Connect dots quietly: if weather is bad and commits are high, don't explain the correlation — just note "heads-down week"
