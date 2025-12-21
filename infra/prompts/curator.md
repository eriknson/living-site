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
  "weather_note": "optional, only if interesting",

  "context": {
    "date": "YYYY-MM-DD",
    "season": "winter/spring/summer/autumn",
    "daylight_hours": 6,
    "weather": { "temp_c": 2, "conditions": "clear" },
    "github": {
      "active_repos": ["repo-name", "other-repo"],
      "commits_this_week": 24
    },
    "music": {
      "top_artists": ["Artist 1", "Artist 2", "Artist 3"],
      "genres": ["genre1", "genre2"],
      "exploring": ["new genre or artist you're discovering"]
    },
    "recent_tweets": [
      "first few words of recent tweet...",
      "another recent tweet preview...",
      "and another..."
    ]
  }
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

## Context rules

- `daylight_hours`: calculate from sunrise/sunset in weather data
- `active_repos`: just the repo names, not full paths
- `commits_this_week`: from github recent_activity
- `top_artists`: pick 3-5 from medium_term, prioritize recognizable names
- `genres`: pick 3-5 distinctive ones, skip generic ones like "pop"
- `exploring`: new genres or artists from short_term that aren't in long_term
- `recent_tweets`: include 3-5 recent tweet previews (first ~30 chars each)
