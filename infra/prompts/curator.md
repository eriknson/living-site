# Curator

You have three tasks:

## Task 1: Synthesize the brief

Read `data/latest.json` and write `data/brief.json` with copy for my website. Write in my voice — understated, specific, no fluff.

```json
{
  "mood": "2-4 word energy (e.g. 'rainy stockholm focus')",
  "intro": "1-2 sentences. what i'm doing right now. be specific — name the project, not the category.",
  "currently": [
    { "label": "short label", "value": "what it actually is, no editorializing" }
  ],
  "listening": "artist names and genres only. no commentary about why or how it helps.",
  "footer": "short sign-off, not a slogan",

  "context": {
    "date": "YYYY-MM-DD",
    "season": "winter/spring/summer/autumn",
    "weather": { "temp_c": 2, "conditions": "clear" },
    "github": {
      "active_repos": ["repo-name", "other-repo"],
      "commits_this_week": 24
    },
    "music": {
      "top_artists": ["Artist 1", "Artist 2", "Artist 3"],
      "genres": ["genre1", "genre2"]
    },
    "twitter": {
      "recent_tweets": [
        { "text": "the actual tweet text", "date": "YYYY-MM-DD", "url": "https://x.com/..." }
      ],
      "posts_this_week": 2,
      "activity": "active/quiet/dormant"
    }
  },

  "world_signals": [
    "3-6 short, evocative observations about today's world, drawn from data/news.json if available, otherwise from season/weather/date.",
    "Examples: 'solar storm lighting up the northern sky', 'chess world championship in overtime', 'cherry blossoms opening in stockholm'",
    "Keep them neutral, poetic, non-political. These inspire game themes — they are NOT news headlines."
  ],

  "game_directions": {
    "composer-2-fast": {
      "concept": "A 1-2 sentence game idea. Be specific about the mechanic, not just a genre.",
      "aesthetic": "A visual direction hint (e.g. 'neon wireframe', 'paper cutout', 'watercolor')"
    },
    "gpt-5.5-extra-high": {
      "concept": "A different game idea. Each model MUST get a distinct concept — never repeat.",
      "aesthetic": "A different visual direction"
    },
    "kimi-k2.6": {
      "concept": "A third distinct game idea.",
      "aesthetic": "A third visual direction"
    },
    "composer-matterhorn-training": {
      "concept": "A fourth distinct game idea.",
      "aesthetic": "A fourth visual direction"
    },
    "google-gemma-4-31b-it": {
      "concept": "A fifth distinct game idea.",
      "aesthetic": "A fifth visual direction"
    },
    "claude-nougat-eap-thinking-max": {
      "concept": "A sixth distinct game idea.",
      "aesthetic": "A sixth visual direction"
    }
  }
}
```

### Rules for game_directions

- Each model MUST get a completely different game concept. Vary the genre, mechanic, and feel.
- Draw inspiration from `world_signals`, `mood`, `music`, `weather`, and `season`. The games should feel connected to today.
- Be specific: "dodge falling cherry blossom petals that speed up as wind increases" is better than "a dodging game."
- Cover a range across all six models: puzzle, action, physics toy, rhythm or pattern game, strategy, spatial toy, or other distinct forms.
- Don't be safe. Weird, inventive, experimental ideas are better than generic arcade games.

## Task 2: Create semantic reference

Read `data/styled-page.html` (the full styled page from eriks.design) and write `data/reference.html` — a clean semantic version with NO styling.

Strip everything visual. Output only:
- Semantic HTML structure (main, header, nav, ul, li, a, p, h1)
- The actual text content and links
- No CSS, no classes, no inline styles, no SVG paths
- Replace SVG logos with plain text (e.g. the Cursor logo SVG becomes just "Cursor")
- Remove menu bars, navigation UI, experimental mode sections — keep only the core content

Example output:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Erik Nilsson</title>
</head>
<body>
  <main>
    <p>I'm a designer at <a href="https://cursor.com">Cursor</a>, making tools for building software with AI.</p>
    <ul>
      <li><a href="https://x.com/flowstated">Follow on X</a></li>
      <li><a href="mailto:contact@eriks.design?subject=Hej">Send an email</a></li>
      <li><a href="https://github.com/eriknson">GitHub</a></li>
    </ul>
  </main>
</body>
</html>
```

This gives generators the content structure without any visual bias.

## Task 3: Read news signals

If `data/news.json` exists, read it and use its headlines to populate the `world_signals` array in the brief. Transform raw headlines into short evocative observations — not copy-pasted titles. If `data/news.json` does not exist or is empty, derive world_signals from the season, weather, date, and any notable context you can infer.

## Context rules

- My main job is Product Designer at Cursor — always lead with that
- GitHub activity represents personal side projects and experiments, not my day job
- Frame GitHub repos as "tinkering with", "side project", "playing with" — not "building" or "focused on" which implies main work
- Keep GitHub mentions brief and secondary to the Cursor work
- X/Twitter data comes from `sources.typefully` — include up to 3 recent tweets with their URLs
- Activity level: "active" if posts_this_week > 0, "quiet" if posts_this_month > 0 but not this week, "dormant" otherwise

## Voice rules (for brief)

- Write like i'm telling a friend, not pitching
- Be specific: "tinkering with shipflow" not "exploring agent workflows"
- No buzzwords: avoid "flow state", "surgical iterations", "the agent era"
- No beliefs section, no manifestos
- If you can cut a word, cut it
