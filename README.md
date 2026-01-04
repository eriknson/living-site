# Living Site

A self-regenerating personal website. AI agents rewrite the site daily based on real activity data.

Built with [Cursor CLI](https://cursor.com/docs/cli) running in GitHub Actions.

## How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Fetch     │ ──▶ │  Aggregate  │ ──▶ │   Curator   │ ──▶ │  Generate   │ ──▶ │   Deploy    │
│  Activity   │     │   Data      │     │   Agent     │     │   Agents    │     │   Vercel    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

1. **Fetch** — Pull activity from GitHub, Spotify, Typefully, Weather APIs
2. **Aggregate** — Combine raw data and compute historical baselines
3. **Curator** — AI agent synthesizes data into a creative brief
4. **Generate** — 4 models build variations in parallel (Composer, Opus, GPT-5.1, Gemini)
5. **Deploy** — HTML committed to main, Vercel auto-deploys

Runs daily at 6am UTC via GitHub Actions.

## File Structure

```
├── app/                      # Next.js app
│   ├── page.tsx              # Manual home page (eriks.design)
│   ├── agent/                # /agent - daily generated versions
│   ├── new/                  # /new - on-demand generation
│   └── api/                  # Build triggers, status endpoints
│
├── infra/
│   ├── prompts/
│   │   ├── system.md         # Design guidelines for generators
│   │   └── curator.md        # Instructions for curator agent
│   ├── aggregator.ts         # Data collection + baseline computation
│   ├── fetchers/             # API clients (GitHub, Spotify, etc.)
│   ├── baselines/            # Historical pattern analysis
│   └── save-build-log.ts     # Build logging + manifest updates
│
├── data/
│   ├── identity.json         # Name, links, socials
│   ├── about.json            # Bio headline
│   ├── location.json         # Current location
│   ├── latest.json           # Most recent aggregated data
│   ├── brief.json            # Curator output for generators
│   └── history/              # Weekly snapshots per source
│
├── generated/                # Agent-written HTML (one per model)
│   ├── composer-1.html
│   ├── claude-4.5-opus-high-thinking.html
│   ├── gpt-5.1-codex.html
│   └── gemini-3-pro.html
│
├── public/builds/            # Archived builds by date
│   ├── manifest.json         # Index of all builds
│   ├── history.json          # Agent logs
│   └── YYYY-MM-DD/           # HTML files per model per day
│
└── lib/                      # Shared utilities and types
```

## Data Sources

| Source | Data | Status |
|--------|------|--------|
| GitHub | Repos, languages, commit patterns | Active |
| Spotify | Top artists, tracks, genres | Active |
| Typefully | Published posts from X | Active |
| Weather | Current conditions at location | Active |
| Location | Coordinates via iOS Shortcut | Active |

Historical data is stored weekly in `data/history/` and used to compute baselines for detecting changes in patterns.

## Local Development

```bash
npm install
npm run dev              # Start Next.js dev server
npm run aggregate        # Fetch activity + compute baselines
npm run curator          # Run curator agent locally
```

## Environment Variables

| Variable | Required | Used For |
|----------|----------|----------|
| `CURSOR_API_KEY` | Yes | Cursor CLI / Cloud Agents API |
| `GITHUB_TOKEN` | Yes | Fetching GitHub activity |
| `KV_REST_API_URL` | Yes | Upstash Redis for build state |
| `KV_REST_API_TOKEN` | Yes | Upstash Redis auth |
| `SPOTIFY_CLIENT_ID` | No | Spotify API |
| `SPOTIFY_CLIENT_SECRET` | No | Spotify API |
| `SPOTIFY_REFRESH_TOKEN` | No | Spotify API |
| `TYPEFULLY_API_KEY` | No | Typefully API |
| `ADMIN_USER` | No | Basic auth for build webhook |
| `ADMIN_PASS` | No | Basic auth for build webhook |

## Routes

- `/` — Manual home page
- `/agent` — View daily AI-generated versions
- `/new` — Generate a fresh build on-demand via Cloud Agents
- `/builds` — Build history and logs

## License

MIT

---

*A poem for the living site*

Code flows like water,
Through circuits and wires bright,
Each day a new creation,
Born from data's gentle light.

The agents weave and wonder,
In patterns they design,
A site that breathes and changes,
Like branches on a vine.

Not static, not forgotten,
But growing, ever new,
A digital reflection,
Of all that's me and you.
