# Living Site

A personal website that regenerates itself daily using AI. It synthesizes activity from GitHub into natural prose — no manual updates required.

## How It Works

```
Daily Cron (6am UTC)
        │
        ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   Aggregate   │ ──▶ │   Generate    │ ──▶ │    Deploy     │
│  GitHub data  │     │  Cursor CLI   │     │    Vercel     │
└───────────────┘     └───────────────┘     └───────────────┘
```

1. **Aggregate** — Fetches repos, languages, commit patterns from GitHub API. Extracts themes like "TypeScript focused" or "actively building".

2. **Generate** — Cursor CLI (headless) reads the system prompt and data, then regenerates `generated/index.html` with synthesized prose.

3. **Deploy** — Changes are committed and pushed, triggering Vercel auto-deploy.

## Structure

```
infra/
├── fetchers/github.ts   # GitHub API client
├── aggregator.ts        # Theme extraction
├── prompts/system.md    # Generation rules & voice
generated/
└── index.html           # AI-generated site (only file Cursor edits)
data/
├── identity.json        # Static info (name, links)
└── latest.json          # Aggregated data + themes
```

## Local Development

```bash
npm install
npm run aggregate          # Fetch + extract themes
npm run generate:api       # Generate with Anthropic API
npm run smoke              # Validate structure
```

## Environment

| Variable | Description |
|----------|-------------|
| `CURSOR_API_KEY` | For CI generation (GitHub Actions) |
| `GITHUB_TOKEN` | For fetching GitHub data |
