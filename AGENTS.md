# Living Site

A self-regenerating personal website built with Next.js 15 and React 19. AI agents rewrite the site daily based on real activity data from GitHub, Spotify, Typefully, and Weather APIs.

## Cloud-specific instructions

### Running the dev server

```bash
pnpm run dev    # Starts Next.js on http://localhost:3000
```

The site renders using pre-existing data in `data/` and pre-generated HTML in `generated/`. No external API keys or services are needed to view the site locally.

### Lint / type-checking

There is no ESLint or Prettier configuration. Use TypeScript's compiler for type-checking:

```bash
npx tsc --noEmit
```

### Build

```bash
pnpm run build
```

The build emits Upstash Redis warnings (`url`/`token` missing) when `KV_REST_API_URL` and `KV_REST_API_TOKEN` are not set. These are harmless — Redis is only needed for the `/api/build` endpoints and does not affect the main site.

### Tests

No automated test framework (Jest, Vitest, etc.) is configured. Validation scripts exist for specific pipelines:

- `pnpm run validate-build` — validates a generated build
- `pnpm run validate-sync` — validates Notion post sync
- `pnpm run smoke` — runs `scripts/smoke.sh`

### Key scripts (see `package.json`)

- `pnpm run aggregate` — fetch activity data and compute baselines (requires API keys)
- `pnpm run curator` — run curator agent locally (requires Cursor API key)
- `pnpm run sync-notion` — fetch and format Notion blog posts

### pnpm build scripts

After `pnpm install`, run `pnpm rebuild esbuild sharp` to ensure native binaries are built. pnpm 10 may skip these build scripts by default.
