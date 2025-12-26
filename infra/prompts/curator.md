# Curator

You have two tasks:

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
    }
  }
}
```

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

## Context rules

- My main job is Product Designer at Cursor — always lead with that
- GitHub activity represents personal side projects and experiments, not my day job
- Frame GitHub repos as "tinkering with", "side project", "playing with" — not "building" or "focused on" which implies main work
- Keep GitHub mentions brief and secondary to the Cursor work

## Voice rules (for brief)

- Write like i'm telling a friend, not pitching
- Be specific: "tinkering with shipflow" not "exploring agent workflows"
- No buzzwords: avoid "flow state", "surgical iterations", "the agent era"
- No beliefs section, no manifestos
- If you can cut a word, cut it
