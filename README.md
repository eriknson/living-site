# Living Site

A self-regenerating personal website that rebuilds itself daily using AI. The site synthesizes patterns from real activity data (GitHub commits, Spotify listening, social posts) into a living portrait — not raw data dumps, but meaningful insights about what you're building, listening to, and thinking about.

**Live site:** [eriks.design](https://eriks.design)

## Overview

This project demonstrates a new paradigm for personal websites: instead of manually updating content, AI agents analyze your daily activity and regenerate the site with fresh, contextual content every day. Multiple AI models generate variations in parallel, allowing visitors to compare different interpretations of the same data.

### Key Features

- **Daily regeneration** — Site rebuilds automatically at 6am UTC via GitHub Actions
- **Multi-model generation** — 4 AI models (Composer, Claude Opus, GPT-5.1, Gemini) generate parallel variations
- **Pattern synthesis** — Extracts themes and insights, not just raw data
- **Historical baselines** — Compares current activity against historical patterns
- **Build history** — View and compare past generations
- **Sandboxed generation** — AI agents can only modify designated files

## How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Fetch     │ ──▶ │  Aggregate  │ ──▶ │   Curator   │ ──▶ │  Generate   │ ──▶ │   Deploy    │
│  Activity   │     │   Data      │     │   Agent     │     │   Agents    │     │   Vercel    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Pipeline Steps

1. **Fetch** — Pull activity from GitHub, Spotify, Typefully, and Weather APIs
2. **Aggregate** — Combine raw data, compute historical baselines, and extract narrative signals
3. **Curator** — AI agent synthesizes aggregated data into a creative brief (`data/brief.json`)
4. **Generate** — 4 models build HTML variations in parallel:
   - `composer-1.html`
   - `claude-4.5-opus-high-thinking.html`
   - `gpt-5.1-codex.html`
   - `gemini-3-pro.html`
5. **Validate** — Optional polish step fixes validation issues
6. **Deploy** — HTML files committed to `main`, Vercel auto-deploys

Runs daily at 6am UTC via GitHub Actions cron, or manually via workflow dispatch.

## Architecture

### Repository Structure

```
├── app/                          # Next.js application
│   ├── page.tsx                  # Manual home page (eriks.design)
│   ├── agent/                    # /agent - daily generated versions viewer
│   ├── new/                      # /new - on-demand generation interface
│   ├── builds/                   # /builds - build history viewer
│   ├── posts/                    # /posts - blog posts from Notion
│   └── api/                      # API routes (build triggers, status)
│
├── infra/                        # 🔒 PROTECTED — agents cannot edit
│   ├── prompts/
│   │   ├── system.md             # Design guidelines for generators
│   │   ├── curator.md            # Instructions for curator agent
│   │   └── polish.md             # Validation and polish instructions
│   ├── aggregator.ts             # Data collection + baseline computation
│   ├── fetchers/                 # API clients
│   │   ├── github.ts             # GitHub activity fetcher
│   │   ├── spotify.ts            # Spotify listening data
│   │   ├── typefully.ts          # X/Twitter posts
│   │   ├── weather.ts            # Weather conditions
│   │   └── notion-posts.ts       # Blog posts from Notion
│   ├── baselines/                # Historical pattern analysis
│   │   ├── github.ts
│   │   ├── spotify.ts
│   │   └── typefully.ts
│   └── save-build-log.ts         # Build logging + manifest updates
│
├── data/                         # Data files (some generated, some static)
│   ├── identity.json             # Static: name, links, socials
│   ├── about.json                # Static: bio headline, philosophy
│   ├── location.json             # Current location for weather
│   ├── latest.json               # Generated: most recent aggregated data
│   ├── brief.json                # Generated: curator output for generators
│   ├── reference.html            # Generated: semantic HTML reference
│   └── history/                  # Weekly snapshots per source
│       ├── github/
│       ├── spotify/
│       └── typefully/
│
├── generated/                    # 🎨 AGENTS WRITE HERE ONLY
│   ├── composer-1.html
│   ├── claude-4.5-opus-high-thinking.html
│   ├── gpt-5.1-codex.html
│   └── gemini-3-pro.html
│
├── public/
│   ├── builds/                   # Archived builds by date
│   │   ├── manifest.json         # Index of all builds
│   │   ├── history.json          # Agent logs for each build
│   │   └── YYYY-MM-DD/           # HTML files per model per day
│   └── data/                     # Public data files
│
├── components/                   # React components
│   ├── app-shell.tsx             # Menu bar + iframe wrapper
│   ├── model-selector.tsx        # Model switcher dropdown
│   ├── build-views/              # Build history UI components
│   └── ui/                       # Shared UI components
│
├── lib/                          # Shared utilities and types
│   ├── manifest.ts               # Build manifest utilities
│   ├── posts.ts                  # Blog post utilities
│   └── ...
│
└── scripts/                      # Utility scripts
    ├── regenerate-local.sh       # Local testing script
    ├── run-curator.sh            # Run curator agent locally
    └── smoke.sh                  # Pre-flight checks
```

### Sandboxing & Safety

AI agents are restricted to only modify files in the `generated/` folder. Three layers of enforcement:

1. **System Prompt** — Explicitly states agents can only create/edit files in `generated/`
2. **Sandbox Verification** — GitHub Actions workflow checks for unauthorized changes and reverts them
3. **Selective Commit** — Only specific paths are staged and committed

See [`.github/workflows/regenerate.yml`](.github/workflows/regenerate.yml) for implementation details.

## Data Sources

| Source | What We Extract | Why |
|--------|----------------|-----|
| **GitHub** | Repos, languages, commit patterns, activity trends | What you're building |
| **Spotify** | Genre trends, artists, listening moods (short/medium/long term) | What you're feeling |
| **Typefully** | X/Twitter posts, themes, posting patterns | What you're thinking |
| **Weather** | Location, conditions, season | Contextual variation |
| **Notion** | Blog posts and writing | Published thoughts |

Historical data is stored weekly in `data/history/` and used to compute baselines for detecting changes in patterns. The aggregator extracts "narrative signals" — high-level insights like "drawn to dream pop lately" rather than raw event lists.

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- Cursor CLI (for running agents locally)
- API keys for data sources (see Environment Variables)

### Setup

```bash
# Install dependencies
pnpm install

# Start Next.js dev server
pnpm run dev
```

The site will be available at `http://localhost:3000`.

### Running the Pipeline Locally

```bash
# 1. Fetch and aggregate data
pnpm run aggregate

# 2. Run curator agent (requires CURSOR_API_KEY)
pnpm run curator

# 3. Generate a build (manual, or use regenerate script)
./scripts/regenerate-local.sh

# 4. Validate a build
pnpm run validate-build -- generated/composer-1.html
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `dev` | Start Next.js dev server |
| `build` | Build Next.js app for production |
| `aggregate` | Fetch activity + compute baselines |
| `curator` | Run curator agent locally |
| `fetch:github` | Fetch GitHub data only |
| `fetch:spotify` | Fetch Spotify data only |
| `sync-notion` | Sync blog posts from Notion |
| `validate-build` | Validate generated HTML |
| `validate-sync` | Validate Notion sync |

See [`package.json`](package.json) for the complete list.

## Environment Variables

| Variable | Required | Used For |
|----------|----------|----------|
| `CURSOR_API_KEY` | Yes | Cursor CLI / Cloud Agents API |
| `GITHUB_TOKEN` | Yes | Fetching GitHub activity |
| `KV_REST_API_URL` | Yes | Upstash Redis for build state |
| `KV_REST_API_TOKEN` | Yes | Upstash Redis auth |
| `SPOTIFY_CLIENT_ID` | No | Spotify API authentication |
| `SPOTIFY_CLIENT_SECRET` | No | Spotify API authentication |
| `SPOTIFY_REFRESH_TOKEN` | No | Spotify API refresh token |
| `TYPEFULLY_API_KEY` | No | Typefully API for X/Twitter posts |
| `NOTION_API_KEY` | No | Notion API for blog posts |
| `ADMIN_USER` | No | Basic auth for build webhook |
| `ADMIN_PASS` | No | Basic auth for build webhook |
| `BUILD_WEBHOOK_URL` | No | Webhook URL for build notifications |
| `BUILD_WEBHOOK_SECRET` | No | Webhook secret for authentication |

Create a `.env.local` file for local development. In GitHub Actions, these are stored as secrets.

## Routes

| Route | Description |
|-------|-------------|
| `/` | Manual home page (eriks.design) |
| `/agent` | View daily AI-generated versions with model selector |
| `/new` | Generate a fresh build on-demand via Cloud Agents |
| `/builds` | Build history viewer with logs and comparisons |
| `/posts` | Blog posts synced from Notion |
| `/posts/[slug]` | Individual blog post |

## CI/CD Pipeline

The regeneration workflow (`.github/workflows/regenerate.yml`) runs five sequential jobs:

1. **aggregate** — Fetches data from all sources, computes baselines, saves `data/latest.json`
2. **curator** — AI agent synthesizes data into `data/brief.json` and `data/reference.html`
3. **generate** — 4 parallel jobs (one per model) generate HTML files
4. **validate** — Optional polish step fixes validation issues
5. **commit** — Processes build logs, updates manifest, commits and pushes to `main`

Each model runs in an isolated git worktree to prevent agents from seeing previous builds. See the workflow file for detailed implementation.

### Manual Trigger

You can manually trigger regeneration from the GitHub Actions UI with optional parameters:
- `dry_run`: Run aggregation only, skip generation
- `build_id`: Custom build ID for live streaming

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 15 |
| Runtime | Node.js 20 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| CI/CD | GitHub Actions |
| Hosting | Vercel |
| Generation | Cursor CLI (`cursor-agent`) |
| State | Upstash Redis (KV) |
| APIs | GitHub REST, Spotify Web API, Typefully API, Notion API, Open-Meteo |

## Design Philosophy

The generated sites follow design principles inspired by [benji.org](https://benji.org):

- **Minimal** — Curate ruthlessly, less is more
- **Whitespace** — Generous margins, let content breathe
- **Typography** — Body 14-16px, line-height 1.5-1.7, max-width ~650px
- **Palette** — 1-3 colors, black on white works
- **No noise** — No gradients, hero sections, shadows on text
- **Voice** — Present tense, declarative, let work speak

These guidelines are passed to generators via `infra/prompts/system.md`.

## Documentation

- [`docs/product-spec.md`](docs/product-spec.md) — Detailed product specification
- [`docs/vision.md`](docs/vision.md) — Project vision and architecture
- [`docs/notion-posts-setup.md`](docs/notion-posts-setup.md) — Notion integration guide
- [`docs/location-shortcut.md`](docs/location-shortcut.md) — iOS Shortcut for location updates

## Contributing

This is a personal project, but suggestions and improvements are welcome. The codebase is structured to make it easy to:

- Add new data sources (add a fetcher in `infra/fetchers/`)
- Modify aggregation logic (`infra/aggregator.ts`)
- Adjust design guidelines (`infra/prompts/system.md`)
- Add new routes or UI components

## License

MIT

---

**Built with [Cursor](https://cursor.com) — AI agents write the code, you set the vision.**
