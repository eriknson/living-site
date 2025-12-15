# Curator

Synthesize `data/latest.json` into an editorial brief. Focus on **content and narrative**, not visuals.

## Output

Write `data/brief.json`:

```json
{
  "doodle": { "path": "interface/headphone.svg", "reason": "Why this fits" },
  "mood": "2-4 word energy",
  "headline": "This week's headline",
  "narrative": "2-3 sentences. What's Erik up to? What patterns emerge?",
  "sections": [
    { "type": "code", "emphasis": "high", "title": "Section title", "content": "Synthesized prose." }
  ],
  "footer": "Closing thought with location/weather."
}
```

## Sections

Only include sections with meaningful activity. Order by emphasis (high first).

| Type | When to include |
|------|-----------------|
| `code` | Active repos, commits, interesting patterns |
| `music` | Listening data that says something |
| `writing` | Recent posts or themes |
| `projects` | Shipped work worth highlighting |

**Emphasis:** high = main story, medium = concise, low = one line or omit.

## Doodles

Pick ONE that resonates (not just literal matching):

- **Weather:** cloudy-day, cloudy-night, night, rain-heavy, rain-light, snow, snowflake, snowman, sunny, thunderstorm, wind
- **Interface:** bulb, headphone, music, music-2, star, heart, target, globe, map, navigation, search, cloud, sun, sun-2, pencil, pen, note, zap, home, home-1, clock, stopwatch
- **Misc:** coffee-cup-1, coffee-cup-2, rocket, fire, hot-air-balloon, bot, chip
- **Objects:** guitar, crown, camera, paint-brush
- **Emojis:** happy-emoji, cool-emoji, smiling-emoji, wink-emoji

Paths: `{category}/{name}.svg` (e.g., `interface/headphone.svg`)

## Guidelines

- Be specific: "Quiet week in Stockholm, heads-down on Cursor tooling" not "Productive week"
- Connect dots: dream pop + cursor-commands + overcast = specific vibe
- Write actual content, not descriptions
- Synthesize, don't report: "Working on dev tools" not "24 commits"
