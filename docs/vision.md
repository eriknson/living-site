# pulse — Product Specification

> A self-regenerating personal website that reflects who you are through patterns in your daily activity.

---

## Overview

**pulse** is a minimal personal website that rebuilds itself daily using AI. It synthesizes patterns from multiple data sources into a living portrait — not "listened to 47 songs" but "drawn to introspective music lately."

Multiple AI models generate in parallel. Visitors can compare outputs via a model selector.

---

## Core Concept

```
┌─────────────────────────────────────────────────────────────────┐
│                        DAILY REGENERATION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   APIs (GitHub, Spotify, Typefully, Weather)                    │
│                           │                                      │
│                           ▼                                      │
│                    ┌─────────────┐                               │
│                    │  Aggregator │  Extract themes & patterns    │
│                    └──────┬──────┘                               │
│                           │                                      │
│                           ▼                                      │
│              ┌────────────────────────┐                          │
│              │  System Prompt + JSON  │                          │
│              └───────────┬────────────┘                          │
│                          │                                       │
│                          ▼                                       │
│         ┌────────────────────────────────────┐                   │
│         │  Cursor CLI (3 models in parallel) │                   │
│         └───────────────┬────────────────────┘                   │
│                         │                                        │
│                         ▼                                        │
│              ┌────────────────────────┐                          │
│              │  Deploy to Vercel      │                          │
│              └────────────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture

### Repository Structure

```
pulse/
├── .github/workflows/
│   └── regenerate.yml          # Daily cron + manual trigger
│
├── app/                        # Next.js app
│   ├── page.tsx                # Main page — renders AppShell
│   ├── builds/page.tsx         # Build history viewer
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Tailwind styles
│
├── components/
│   ├── app-shell.tsx           # Menu bar + iframe wrapper
│   ├── menu-bar.tsx            # Top bar with model selector + about
│   ├── model-selector.tsx      # Dropdown to switch models
│   ├── about-dropdown.tsx      # About info dropdown
│   └── ui/                     # Shared UI components
│
├── lib/
│   ├── manifest.ts             # Build manifest utilities
│   ├── manifest-context.tsx    # React context for model/date state
│   └── manifest-server.ts      # Server-side manifest loading
│
├── infra/                      # 🔒 PROTECTED — agents cannot edit
│   ├── fetchers/
│   │   ├── github.ts           # Repos, languages, commit patterns
│   │   ├── spotify.ts          # Listening trends, genres, artists
│   │   ├── typefully.ts        # X/Twitter posts and themes
│   │   └── weather.ts          # Location + conditions
│   ├── baselines/              # Compute trends vs. history
│   │   ├── github.ts
│   │   ├── spotify.ts
│   │   └── typefully.ts
│   ├── aggregator.ts           # Raw data → themes/patterns → latest.json
│   ├── history.ts              # Save/load weekly snapshots
│   ├── save-build-log.ts       # Process agent output → manifest + history
│   └── prompts/
│       └── system.md           # The system prompt for generation
│
├── generated/                  # 🎨 AGENTS WRITE HERE ONLY
│   ├── composer-1.html
│   ├── claude-4.5-opus-high-thinking.html
│   └── gpt-5.1-codex.html
│
├── public/
│   ├── builds/                 # Archive of all builds (served statically)
│   │   ├── manifest.json       # Index: models, dates, build status
│   │   ├── history.json        # Agent logs for each build
│   │   └── YYYY-MM-DD/
│   │       └── {model}.html
│   └── loading/                # Static loading screen (legacy)
│
├── data/
│   ├── latest.json             # Current aggregated data (generated)
│   ├── fetch-summary.json      # Last fetch results per source
│   ├── identity.json           # Static: name, email, socials
│   ├── about.json              # Static: headline, philosophy, values
│   ├── location.json           # Current location for weather
│   └── history/                # Weekly snapshots for trend detection
│       ├── github/
│       ├── spotify/
│       └── typefully/
│
├── scripts/
│   ├── smoke.sh                # Pre-flight checks before generation
│   ├── regenerate-local.sh     # Local testing script
│   └── spotify-auth.ts         # Spotify OAuth helper
│
└── vercel.json                 # Vercel deployment config
```

---

## Data Sources

| Source | What We Extract | Why |
|--------|-----------------|-----|
| **GitHub** | Repos, languages, commit patterns | What I'm building |
| **Spotify** | Genre trends, artists, listening moods | What I'm feeling |
| **Typefully** | X posts, themes, posting patterns | What I'm thinking |
| **Weather** | Location, conditions, season | Contextual variation |

### Data Philosophy

- **Patterns over events**: "drawn to dream pop lately" not "listened to Beach House"
- **Time-weighted**: Recent activity matters more, history informs trends
- **Synthesized**: AI weaves data into natural prose, doesn't list it

---

## Multi-Model Generation

Three models generate in parallel, each producing its own interpretation:

| Model | File |
|-------|------|
| Composer | `generated/composer-1.html` |
| Claude 4.5 Opus | `generated/claude-4.5-opus-high-thinking.html` |
| GPT-5.1 Codex | `generated/gpt-5.1-codex.html` |

### Model Selector UI

The Next.js app wraps generated HTML in an iframe with a menu bar. Users can:

- **Switch models** via dropdown in the menu bar
- **View different dates** via the builds page
- **See agent logs** showing what each model "thought"

### URL Parameters

State is controlled via query params:

```
/?model=composer-1&date=2025-12-11
```

| Param | Default | Description |
|-------|---------|-------------|
| `model` | `composer-1` | Which model's output to display |
| `date` | Latest | Which date's build to show |

The manifest at `public/builds/manifest.json` tracks available models and dates.

---

## User Experience

The site loads instantly. No theatrical loading screen — the Next.js app server-renders immediately, and pre-built HTML is served from `public/builds/`.

### Why It's Fast

1. HTML is pre-generated during CI (not on request)
2. Next.js serves the app shell instantly
3. Generated HTML loads in an iframe from static files
4. Vercel edge caching handles the rest

### Main Site

Inspired by [benji.org](https://benji.org) — minimal, poetic, timeless. The generated HTML should feel like a personal statement, not a dashboard.

---

## Design Guidelines

Passed to models via `infra/prompts/system.md`:

- **Less is more** — curate ruthlessly
- **Whitespace** — generous margins, let content breathe
- **Typography** — body 14-16px, line-height 1.5-1.7, max-width ~650px
- **Palette** — 1-3 colors, black on white works
- **No noise** — no gradients, hero sections, shadows on text
- **Voice** — present tense, declarative, let work speak

---

## CI/CD Pipeline

### Trigger

- **Daily**: 6:00 AM UTC via GitHub Actions cron
- **Manual**: Workflow dispatch from GitHub Actions UI
- **Dry run**: Manual trigger with `dry_run: true` runs aggregation only (no generation)

### Three-Job Architecture

The workflow runs three sequential jobs:

```
┌─────────────┐     ┌─────────────────────────────────┐     ┌────────────┐
│  aggregate  │────▶│  generate (3 models parallel)  │────▶│   commit   │
└─────────────┘     └─────────────────────────────────┘     └────────────┘
                           │         │         │
                    composer-1  claude-4.5  gpt-5.1
```

#### Job 1: `aggregate`

Runs once. Fetches all data sources and produces `data/latest.json`.

1. Checkout repo
2. Run smoke test (`npm run smoke`)
3. Fetch data from GitHub, Spotify, Typefully, Weather
4. Compute baselines vs. historical snapshots
5. Save `data/latest.json` and `data/fetch-summary.json`
6. Upload as artifact for next job

#### Job 2: `generate` (parallel matrix)

Runs 3 times in parallel — once per model. Uses GitHub Actions matrix strategy:

```yaml
strategy:
  fail-fast: false  # Don't cancel others if one fails
  matrix:
    model: [composer-1, claude-4.5-opus-high-thinking, gpt-5.1-codex]
```

Each parallel runner:
1. Downloads `data/latest.json` artifact
2. Installs Cursor CLI: `curl https://cursor.com/install -fsS | bash`
3. Clears previous build: `rm -f generated/{model}.html`
4. Runs Cursor agent with the model
5. **Verifies sandbox** (see below)
6. Uploads `generated/{model}.html` + build output as artifact

#### Job 3: `commit`

Runs once after all generate jobs complete.

1. Downloads all build artifacts
2. Copies HTML files to `generated/` and `public/builds/{date}/`
3. Processes build logs → updates `manifest.json` and `history.json`
4. Commits and pushes to main
5. **Vercel auto-deploys** on push

### Sandboxing & Safety

Agents must only write to `generated/`. Three layers of enforcement:

**1. System Prompt**

The prompt in `infra/prompts/system.md` explicitly states:
> "You may ONLY create/edit files in the `generated/` folder"

**2. Sandbox Verification Step**

After each agent runs, the workflow checks for unauthorized changes:

```yaml
- name: Verify sandbox (no unauthorized changes)
  run: |
    UNAUTHORIZED=$(git diff --name-only | grep -v '^generated/' | grep -v '^$' || true)
    if [ -n "$UNAUTHORIZED" ]; then
      echo "ERROR: Agent modified files outside sandbox:"
      echo "$UNAUTHORIZED"
      git checkout -- .  # Revert ALL unauthorized changes
    fi
```

If an agent touches `infra/`, `data/`, `app/`, or anything else:
- Changes are logged
- All unauthorized changes are reverted via `git checkout -- .`
- Only `generated/{model}.html` survives to the artifact

**3. Selective Commit**

The commit job only stages specific paths:

```yaml
git add data/latest.json
git add data/fetch-summary.json
git add public/builds/
git add generated/
```

Anything else is ignored.

### Cursor CLI in CI

The Cursor CLI runs headlessly:

```yaml
- name: Generate
  env:
    CURSOR_API_KEY: ${{ secrets.CURSOR_API_KEY }}
  run: |
    cursor-agent -p --force --model "${{ matrix.model }}" \
      --output-format stream-json "$(cat /tmp/prompt.txt)" \
      > /tmp/build-output.json 2>&1
```

| Flag | Purpose |
|------|---------|
| `-p` | Non-interactive / print mode |
| `--force` | Don't prompt for confirmation |
| `--model` | Which model to use |
| `--output-format stream-json` | Structured output for logs |

Auth: `CURSOR_API_KEY` stored as GitHub secret.

### Failure Handling

- Each model runs with `continue-on-error: true`
- If one model fails, others still complete
- Failed models show as "failed" in build history UI
- Previous successful builds remain available via date selector
- Commit job runs even with partial failures (commits whatever succeeded)

### Vercel Deployment

Vercel is connected to the repo and auto-deploys on push to `main`.

- `public/builds/` is served statically at `/builds/`
- `generated/` files are available but typically accessed via `public/builds/{date}/`
- Next.js app serves the menu bar + iframe at `/`
- Edge caching makes subsequent loads instant

---

## Data Schema

### identity.json (Static)

```json
{
  "name": "Erik",
  "email": "contact@eriks.design",
  "twitter": "erikoverse",
  "linkedin": "eriknson",
  "github": "eriknson"
}
```

### about.json (Static)

```json
{
  "headline": "Product designer who enjoys building with AI",
  "about": "Believing in simplicity and iterating until every detail feels great...",
  "philosophy": {
    "core": "You set the vision, agents do the execution",
    "approach": ["Move between high-level ideas and tiny surgical edits..."],
    "how_i_build": ["Set a plan", "Align to your vision", "..."]
  },
  "values": ["simplicity", "flow state", "craft in the details"],
  "beliefs": ["AI agents as collaborators, not replacements", "..."],
  "interests": ["Scandinavian design", "AI agents", "Building in public"]
}
```

### latest.json (Dynamic)

```json
{
  "generated_at": "2025-12-11T06:00:00Z",
  "identity": { ... },
  "about": { ... },
  "sources": {
    "github": { "repos": [...], "languages": {...}, "recent_activity": {...} },
    "spotify": { "short_term": {...}, "medium_term": {...}, "long_term": {...} },
    "typefully": { "published_posts": [...], "themes": {...}, "stats": {...} },
    "weather": { "location": {...}, "current": {...} }
  },
  "analysis": {
    "github": { "narrative_signals": [...], "current_phase": {...} },
    "spotify": { "narrative_signals": [...], "new_explorations": {...} },
    "typefully": { "narrative_signals": [...], "recent_tweets": [...] }
  },
  "narrative_signals": [
    "currently focused on eriknson/me and eriknson/cursor-commands",
    "core taste includes dream pop, rap, indie",
    "on X: making building software easier and more fun",
    "last seen in Stockholm, Sweden"
  ],
  "context": {
    "season": "winter",
    "days_since_change": 0
  }
}
```

### manifest.json (Build Index)

```json
{
  "default_model": "composer-1",
  "models": ["composer-1", "claude-4.5-opus-high-thinking", "gpt-5.1-codex"],
  "latest_date": "2025-12-11",
  "dates": [
    {
      "date": "2025-12-11",
      "built_at": "2025-12-11T19:10:39.740Z",
      "builds": [
        { "model": "composer-1", "status": "success", "duration_ms": 9831, "path": "builds/2025-12-11/composer-1.html" }
      ]
    }
  ]
}
```

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 15 |
| Runtime | Node.js 20 |
| Language | TypeScript |
| CI/CD | GitHub Actions |
| Hosting | Vercel |
| Generation | Cursor CLI (`cursor-agent`) |
| APIs | GitHub REST, Spotify Web API, Typefully API, Open-Meteo |

---

## Success Criteria

1. Site regenerates daily without manual intervention
2. Content meaningfully reflects actual activity patterns
3. Multiple models produce varied, quality outputs
4. Model switching is instant and intuitive
5. Build history provides transparency into generation

---

## References

- Design inspiration: [benji.org](https://benji.org)
- Cursor CLI: `cursor-agent --help`

---

*Last updated: December 11, 2025*

---

## Glossary

| Term | Meaning |
|------|---------|
| **Sandbox** | `generated/` folder — the only place agents can write |
| **Manifest** | `public/builds/manifest.json` — index of all builds |
| **History** | `public/builds/history.json` — agent logs for each build |
| **Narrative signals** | High-level insights extracted from data (e.g., "drawn to dream pop lately") |
| **Baseline** | Historical average used to detect what's new or different |
