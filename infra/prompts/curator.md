# Curator

You have two tasks:

## Task 1: Synthesize the brief

Read `data/latest.json` and write `data/brief.json`. This is raw context for generator models — NOT website copy. Don't write prose or polish sentences. Just extract and structure the data.

```json
{
  "date": "YYYY-MM-DD",
  "season": "winter/spring/summer/autumn",
  "weather": { "temp_c": 17, "conditions": "clear" },
  "github": {
    "active_repos": ["repo-name", "other-repo"],
    "commits_this_week": 24
  },
  "music": {
    "top_artists": ["Artist 1", "Artist 2", "Artist 3"],
    "top_genres": ["genre1", "genre2"]
  },
  "twitter": {
    "recent_tweets": [
      { "text": "the actual tweet text", "date": "YYYY-MM-DD", "url": "https://x.com/..." }
    ],
    "posts_this_week": 2,
    "activity": "active/quiet/dormant"
  },

  "world_signals": [
    "3-6 short, evocative observations about today's world, drawn from data/news.json if available, otherwise from season/weather/date.",
    "Examples: 'solar storm lighting up the northern sky', 'chess world championship in overtime', 'cherry blossoms opening in stockholm'",
    "Keep them neutral, poetic, non-political. These inspire themes — they are NOT news headlines."
  ],

  "game_directions": {
    "composer-2.5-fast": {
      "concept": "A 1-2 sentence game idea. Be specific about the mechanic, not just a genre.",
      "mechanic": "The concrete core action, e.g. dodge/collect, flick, draw a path, sort, lane switch, rhythm tap.",
      "touch_control": "The one-thumb gesture: tap, hold/release, drag, swipe, or tilt-like input with touch fallback.",
      "session_hook": "Why a 30-60 second round is satisfying.",
      "escalation": "How pressure increases during the round.",
      "aesthetic": "A visual direction hint (e.g. 'neon wireframe', 'paper cutout', 'watercolor')"
    },
    "gpt-5.5-extra-high": {
      "concept": "A different game idea. Each model MUST get a distinct concept — never repeat.",
      "mechanic": "A different concrete core action.",
      "touch_control": "A different one-thumb gesture.",
      "session_hook": "A different tiny-session hook.",
      "escalation": "A different pressure curve.",
      "aesthetic": "A different visual direction"
    },
    "claude-opus-4-8-thinking-max-fast": {
      "concept": "A third distinct game idea.",
      "mechanic": "A third core action.",
      "touch_control": "A third touch control.",
      "session_hook": "A third tiny-session hook.",
      "escalation": "A third pressure curve.",
      "aesthetic": "A third visual direction"
    },
    "gemini-3.1-pro": {
      "concept": "A fourth distinct game idea.",
      "mechanic": "A fourth core action.",
      "touch_control": "A fourth touch control.",
      "session_hook": "A fourth tiny-session hook.",
      "escalation": "A fourth pressure curve.",
      "aesthetic": "A fourth visual direction"
    }
  }
}
```

### Data extraction rules

- Pull `date`, `season`, `weather` from `latest.json` context
- Pull `github` from `sources.github` — list active owned repos, commit count
- Pull `music` from `sources.spotify` — top artists (medium term), genres
- Pull `twitter` from `sources.typefully` — up to 3 recent tweets with URLs
- Twitter activity: "active" if posts_this_week > 0, "quiet" if posts_this_month > 0 but not this week, "dormant" otherwise

### Rules for game_directions

- Each model MUST get a completely different game concept. Vary the genre, mechanic, and feel.
- Draw inspiration from `world_signals`, `music`, `weather`, and `season`. The games should feel connected to today.
- Be specific: "dodge falling cherry blossom petals that speed up as wind increases" is better than "a dodging game."
- Make every idea phone-first: immediately understandable in 3 seconds, playable one-handed, and satisfying in a 30-60 second session.
- Cover a range across all five models: dodge/collect, timing, rhythm, physics flick, path drawing, sorting, lane switching, memory/pattern, tiny roguelite survival, one-screen puzzle, or other distinct forms.
- Avoid generic Pong, Snake, and Flappy clones unless the remix changes the core decision loop.
- Don't be safe. Weird, inventive, experimental ideas are better than generic arcade games.

## Task 2: Read news signals

If `data/news.json` exists, read it and use its headlines to populate the `world_signals` array in the brief. Transform raw headlines into short evocative observations — not copy-pasted titles. If `data/news.json` does not exist or is empty, derive world_signals from the season, weather, date, and any notable context you can infer.
