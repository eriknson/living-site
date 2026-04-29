# Living Site — Product Spec

A self-regenerating personal website for Erik. The site regenerates daily using AI, reflecting patterns and themes from activity across GitHub, Spotify, Strava, Notion, and other data sources — not raw data, but synthesized insights about what you're building, listening to, and thinking about over time.

---

## How It Works

1. **Daily cron job** (GitHub Actions) fetches data from APIs
2. **Aggregator** extracts themes/patterns and builds a JSON payload
3. **Cursor CLI** receives a system prompt + JSON and regenerates the site
4. **Generated files** are committed and pushed, triggering Vercel deploy
5. **Visitors** see a loading screen ("Thinking...") that transitions to the pre-built site

---

## Architecture

```
living-site/
├── .github/workflows/
│   └── regenerate.yml        # Daily cron (6am Pacific daylight time) + manual trigger
│
├── infra/                    # PROTECTED — Cursor cannot edit
│   ├── fetchers/
│   │   ├── github.ts         # Repos, languages, commit patterns
│   │   ├── spotify.ts        # Listening trends, genres, artists
│   │   ├── strava.ts         # Running patterns, distances
│   │   ├── notion.ts         # Writing themes (TBD)
│   │   └── weather.ts        # For seasonal context
│   ├── aggregator.ts         # Combines raw data → themes
│   ├── generator.ts          # Calls Cursor CLI with prompt + data
│   └── prompts/
│       └── system.md         # The system prompt (visual identity, rules)
│
├── generated/                # CURSOR EDITS THIS ONLY
│   ├── index.html            # The generated site
│   └── styles.css            # (or embedded in HTML)
│
├── public/                   # PROTECTED — Static assets
│   └── loading/
│       ├── index.html        # Loading screen entry point
│       └── styles.css
│
├── data/
│   ├── latest.json           # Current aggregated data
│   └── identity.json         # Static info (name, links, bio basics)
│
└── builds/                   # Fallback archive of previous builds
```

---

## Key Mechanics

### Sandboxing

The Cursor CLI prompt explicitly restricts edits to `generated/` only. The GitHub Action discards any changes outside this folder before committing.

### Fallback Strategy

If generation fails:
1. Retry up to 3 times
2. If still failing, keep the previous day's build
3. Log the failure for manual review

### Variation

To keep the site feeling alive even when patterns haven't shifted:
- Include season + weather in the JSON context
- System prompt allows subtle tonal shifts based on context
- If nothing has changed in 3+ days, prompt encourages small intentional variation

### Loading Screen

A static page with "Thinking..." and poetic loading messages (e.g., "Listening to patterns in the noise"). This doesn't change daily — it's a theatrical transition to the pre-built site.

---

## Design Reference

Style inspired by benji.org:
- Light gray background (#f5f5f5)
- Clean system typography
- Sparse, lots of whitespace
- Blue links with external indicators
- First-person, conversational but concise copy
- Structure: Name → Updated date → Bio paragraphs → Timeline → Poetic footer
- No shadows on text, no decorative elements, no images

---

## Tech Stack

- **Runtime**: Node.js (for infra scripts)
- **Hosting**: Vercel (static deploy from `generated/` + `public/`)
- **CI/CD**: GitHub Actions (cron + Cursor CLI execution)
- **APIs**: GitHub REST API, Spotify Web API, Strava API, Notion API, Open-Meteo (weather)

---

## Phase 1 Scope (MVP)

1. Set up repo structure with sandboxing
2. Create the static loading screen
3. Build GitHub fetcher (simplest API to start)
4. Create the system prompt for site generation
5. Set up GitHub Action that manually triggers Cursor CLI
6. Deploy to Vercel
7. Verify end-to-end: trigger → fetch → generate → deploy

---

## Out of Scope for MVP

- Spotify, Strava, Notion integrations (add after GitHub works)
- Automatic daily cron (start with manual trigger)
- Historical data / trend analysis (start with recent activity only)
- Typefully integration

---

## Open Questions

1. Cursor CLI authentication in GitHub Actions — test this early
2. Vercel routing: loading screen vs generated site — may need rewrites
3. How to handle Cursor CLI failures gracefully

