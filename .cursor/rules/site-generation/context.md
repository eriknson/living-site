---
description: Data sources and voice for site generation
globs: 
  - generated/*.html
---

# Site Generation Context

## Data Sources
- `data/brief.json` — themes and highlights (use as **inspiration**, don't copy verbatim)
- `data/latest.json` — raw data (repos, music, weather, etc)
- `data/identity.json` — my links

## Voice
- First-person, lowercase, conversational
- Honest, reflective, no "AI buzzwords"
- Write the text yourself — brief provides *topics*, you provide the *voice*

## Output
- Single HTML file, inline CSS
- Include my links from `identity.json`
- Output to `generated/{model}.html`

