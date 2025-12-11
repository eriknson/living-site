# pulse — Product Specification

> A self-regenerating personal website that reflects who you are through patterns in your daily activity.

---

## Overview

**pulse** is a minimal, poetic personal website that rebuilds itself daily using AI. Rather than displaying raw activity data ("I listened to 47 songs today"), it synthesizes patterns and themes from multiple sources to create a living portrait that evolves over time.

The site is generated server-side via the Cursor CLI, which receives a system prompt and aggregated activity data as JSON. Visitors see a theatrical loading screen before the pre-built content appears.

---

## Core Concept

```
┌─────────────────────────────────────────────────────────────────┐
│                        DAILY REGENERATION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   APIs (GitHub, Spotify, Strava, Notion, Weather)               │
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
│                   ┌─────────────┐                                │
│                   │  Cursor CLI │  Generates HTML/CSS            │
│                   └──────┬──────┘                                │
│                          │                                       │
│                          ▼                                       │
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
├── .github/
│   └── workflows/
│       └── regenerate.yml        # Daily cron + manual trigger
│
├── infra/                        # 🔒 PROTECTED — Cursor cannot edit
│   ├── fetchers/
│   │   ├── github.ts             # Repos, languages, commit patterns
│   │   ├── spotify.ts            # Listening trends, genres, artists
│   │   ├── strava.ts             # Running patterns, distances
│   │   ├── notion.ts             # Writing themes
│   │   └── weather.ts            # Seasonal context
│   ├── aggregator.ts             # Raw data → themes/patterns
│   ├── generator.ts              # Orchestrates Cursor CLI
│   └── prompts/
│       └── system.md             # The system prompt
│
├── generated/                    # 🎨 CURSOR EDITS THIS ONLY
│   ├── index.html                # The generated site
│   └── styles.css                # (or embedded)
│
├── public/                       # 🔒 PROTECTED — Static assets
│   └── loading/
│       ├── index.html            # Loading screen
│       └── styles.css
│
├── data/
│   ├── latest.json               # Current aggregated data
│   ├── identity.json             # Static info (name, links, etc.)
│   └── history/                  # Rolling window for trends
│
└── builds/                       # Archive of previous builds
    └── YYYY-MM-DD.html
```

### Sandboxing Strategy

The Cursor CLI is explicitly instructed to only edit files in `generated/`. Additionally:

1. The system prompt states: *"You may ONLY edit files in the `generated/` directory"*
2. The GitHub Action discards any changes outside `generated/` before committing
3. Critical infra code is in a separate, protected directory

---

## Data Sources

| Source | What We Extract | Why |
|--------|-----------------|-----|
| **GitHub** | Repos, languages, commit patterns, project themes | What I'm building |
| **Spotify** | Genre trends, artist patterns, listening moods | What I'm feeling |
| **Strava** | Running consistency, distances, activity patterns | How I'm moving |
| **Notion** | Writing themes, topics, recurring ideas | What I'm thinking |
| **Weather** | Current conditions, season | Contextual variation |

### Data Philosophy

- **Patterns over events**: Not "listened to Bob Dylan today" but "drawn to folk and introspective music lately"
- **Time-weighted**: Recent activity matters more, but history informs trends
- **Synthesized, not listed**: The AI weaves data into natural prose

---

## User Experience

### Loading Screen

A static page that doesn't change daily. Creates a theatrical transition:

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│                                         │
│            Thinking                     │
│                                         │
│            Erik's been building X       │
│            Listening to folk music      │
│            Running through winter       │
│            Writing about Y              │
│                                         │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

- "Thinking" header with subtle color animation
- Dynamic-feeling loading messages (even though pre-determined)
- Transitions to the actual site after a few seconds

### Main Site

Inspired by [benji.org](https://benji.org) — minimal, poetic, timeless:

```
┌─────────────────────────────────────────┐
│                                         │
│  Erik                                   │
│  Updated December 9, 2024               │
│                                         │
│  I'm based in [location], building      │
│  [what I'm working on].                 │
│                                         │
│  Lately I've been [themes from data].   │
│  [More synthesized content...]          │
│                                         │
│  You can reach me at @handle or email.  │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  2024   Project Name              08/12 │
│  2024   Another Project           03/15 │
│                                         │
│                                         │
│  Letting time pass...                   │
│                                         │
└─────────────────────────────────────────┘
```

---

## Design Specifications

### Visual Identity (Fixed)

| Property | Value |
|----------|-------|
| Background | `#f5f5f5` (light warm gray) |
| Body text | `#1a1a1a` (near black) |
| Secondary text | `#999999` (dates, footer) |
| Links | `#007AFF` (iOS blue) |
| Font family | System stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` |
| Body font size | 15px |
| Line height | 1.6 |
| Max width | 600px, centered |

### Rules

- No shadows on text (ever)
- No decorative borders or elements
- No images unless explicitly provided
- Generous whitespace — let content breathe
- Mobile responsive by default

### What May Vary

- Specific wording of bio paragraphs
- The poetic footer phrase
- Subtle tonal shifts based on season/weather
- Which items appear in the timeline

---

## Regeneration Mechanics

### Trigger

- **Primary**: Daily cron job via GitHub Actions (e.g., 6:00 AM UTC)
- **Secondary**: Manual trigger via GitHub Actions workflow dispatch

### Process

1. GitHub Action triggers
2. `infra/fetchers/*` fetch data from each API
3. `infra/aggregator.ts` processes raw data into themes/patterns
4. Aggregated data saved to `data/latest.json`
5. Multiple models generate in parallel, each to its own sandbox (`generated/{model}.html`)
6. Builds are saved to `public/builds/{date}/{model}.html`
7. Action commits changes
8. Push triggers Vercel deployment

### Fallback Strategy

```
Generation attempt
       │
       ├── Success → Commit & deploy
       │
       └── Failure → Retry (up to 3x)
                          │
                          ├── Success → Commit & deploy
                          │
                          └── Still failing → Keep previous build
                                              Log for manual review
```

### Variation Strategy

To keep the site feeling alive even when activity patterns haven't shifted:

1. **Contextual data**: Include season, weather, day of week in JSON
2. **Staleness tracking**: Include `days_since_meaningful_change` in context
3. **Prompt guidance**: System prompt encourages subtle variation when stale
4. **Seasonal tone**: Word choice reflects the time of year

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ |
| Language | TypeScript |
| CI/CD | GitHub Actions |
| Hosting | Vercel (static) |
| Generation | Cursor CLI |
| APIs | GitHub REST, Spotify Web API, Strava API, Notion API, Open-Meteo |

---

## Data Schema

### Identity (Static)

```json
{
  "name": "Erik",
  "location": "...",
  "email": "contact@eriks.design",
  "twitter": "0xago",
  "linkedin": "eriknson",
  "website": "eriks.design"
}
```

### Aggregated Data (Dynamic)

```json
{
  "generated_at": "2024-12-09T06:00:00Z",
  "themes": {
    "building": {
      "summary": "Working on developer tools and personal projects",
      "languages": ["TypeScript", "Python"],
      "recent_projects": ["pulse", "another-project"],
      "patterns": ["focused on DX", "exploring AI integrations"]
    },
    "listening": {
      "summary": "Drawn to ambient and folk lately",
      "top_genres": ["ambient", "folk", "electronic"],
      "mood": "introspective",
      "notable_artists": ["Brian Eno", "Bon Iver"]
    },
    "moving": {
      "summary": "Consistent running through the winter",
      "weekly_distance_km": 35,
      "pattern": "morning runner",
      "streak_days": 12
    },
    "thinking": {
      "summary": "Writing about tools for thought",
      "topics": ["productivity", "AI", "design"],
      "recent_themes": ["simplicity", "intentional technology"]
    }
  },
  "context": {
    "season": "winter",
    "weather": "overcast",
    "temperature_c": 8,
    "day_of_week": "monday",
    "days_since_last_change": 2
  },
  "timeline": [
    {
      "year": 2024,
      "title": "pulse",
      "date": "12/09",
      "url": "https://github.com/..."
    }
  ]
}
```

---

## Implementation Phases

### Phase 1: Foundation (MVP)

- [ ] Scaffold repo structure with sandboxing
- [ ] Create static loading screen
- [ ] Set up Vercel deployment
- [ ] Create identity.json with static data
- [ ] Write initial system prompt
- [ ] Test Cursor CLI in GitHub Actions (authentication, execution)
- [ ] Build GitHub fetcher (simplest API)
- [ ] Create basic aggregator
- [ ] End-to-end test: manual trigger → generate → deploy

### Phase 2: Data Sources

- [ ] Add Spotify integration
- [ ] Add Strava integration
- [ ] Add weather/seasonal context
- [ ] Enhance aggregator with theme extraction

### Phase 3: Polish

- [ ] Add Notion integration
- [ ] Implement historical data for trend detection
- [ ] Refine system prompt based on outputs
- [ ] Add fallback/retry logic
- [ ] Enable daily cron trigger

### Phase 4: Enhancements (Future)

- [ ] Typefully integration
- [ ] More sophisticated trend analysis
- [ ] A/B testing different prompt variations
- [ ] Analytics on generation quality

---

## Open Questions

1. **Cursor CLI in CI**: Can it run headlessly in GitHub Actions? What auth is needed?
2. **Vercel routing**: How to serve loading screen vs generated site? Rewrites?
3. **Rate limits**: How to handle API rate limits gracefully?
4. **Cost**: Cursor CLI API costs for daily generation?
5. **Quality control**: How to detect/prevent bad generations?

---

## Success Criteria

The project is successful when:

1. The site regenerates daily without manual intervention
2. Content meaningfully reflects actual activity patterns
3. The output is consistently high-quality and on-brand
4. Failures are handled gracefully with fallbacks
5. The loading → site transition feels polished
6. Visitors perceive the site as "alive" and personal

---

## References

- Design inspiration: [benji.org](https://benji.org)
- Cursor CLI docs: [cursor.sh/cli](https://cursor.sh/cli)

---

*Last updated: December 9, 2024*
