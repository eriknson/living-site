# Living Site

A self-regenerating personal website. An AI agent rewrites the site daily based on real activity data — no manual updates needed.

Built with [Cursor CLI](https://cursor.com/docs/cli) running headless in GitHub Actions.

## The Concept

Instead of a static portfolio that gets stale, this site stays current automatically. An agent reads activity from various sources, synthesizes it into natural prose, and regenerates the HTML.

The agent follows strict design guidelines but has creative freedom in how it presents the content. Each build produces slightly different output while maintaining consistency.

## How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Fetch     │ ──▶ │  Aggregate  │ ──▶ │  Generate   │ ──▶ │   Deploy    │
│  Activity   │     │   Themes    │     │  Cursor CLI │     │   Vercel    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

1. **Fetch** — Pull activity from connected sources (GitHub, more coming)
2. **Aggregate** — Extract themes and patterns from raw data
3. **Generate** — Cursor CLI reads the prompt + data, rewrites the site
4. **Deploy** — Changes committed to main, Vercel auto-deploys

Runs daily at 6am UTC via GitHub Actions, or triggered manually.

## File Structure

```
├── infra/
│   ├── prompts/system.md    # Design rules, voice, constraints (locked)
│   ├── aggregator.ts        # Theme extraction logic (locked)
│   └── fetchers/            # Data source clients (locked)
│       └── github.ts
│
├── data/
│   ├── identity.json        # Static info: name, links (locked)
│   └── latest.json          # Aggregated activity data (generated)
│
├── generated/
│   └── index.html           # The site (agent-written)
│
├── builds/
│   ├── history.json         # Build logs with agent reasoning
│   └── index.html           # Build history viewer at /builds
│
└── index.html               # Production copy (synced from generated/)
```

**Locked files** define the rules and identity — the agent can't modify these.  
**Generated files** are written by the agent each build cycle.

## Data Sources

Activity is pulled from external APIs and aggregated into themes:

| Source | Data | Status |
|--------|------|--------|
| GitHub | Repos, languages, commit patterns | Active |
| Spotify | Top artists, tracks, genres by time range | Active |
| Typefully | Published posts, themes | Active |
| Weather | Current conditions at location | Active |
| Location | "Last seen" with coordinates | Active |
| Strava | Recent activities, stats | Planned |

The aggregator extracts high-level themes like "TypeScript focused" or "actively building" rather than exposing raw data.

### Updating Location

Location can be updated via iOS Shortcut → GitHub API. See [docs/location-shortcut.md](docs/location-shortcut.md) for setup instructions.

## Build History

Each build captures the full agent conversation — what it read, what it changed, and why. View at `/builds` on the live site.

## Local Development

```bash
npm install
npm run aggregate        # Fetch activity + extract themes
npm run generate:api     # Generate via Anthropic API (local)
```

## Environment

| Variable | Used For |
|----------|----------|
| `CURSOR_API_KEY` | CI generation via Cursor CLI / Cloud Agents API |
| `GITHUB_TOKEN` | Fetching GitHub activity + Cloud Agents branch operations |
| `GITHUB_REPO` | Repository for Cloud Agents (default: `eriknson/living-site`) |
| `ANTHROPIC_API_KEY` | Local generation (optional) |

### Live Generation (/new)

The `/new` page uses [Cursor Cloud Agents API](https://cursor.com/docs/cloud-agent/api/endpoints) to generate sites on-demand. This requires:
- `CURSOR_API_KEY` from your [Cursor Dashboard](https://cursor.com/settings)
- `GITHUB_TOKEN` with repo access (contents:read, delete refs)
