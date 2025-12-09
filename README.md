# Living Site

A self-regenerating personal website that reflects patterns from GitHub, Spotify, Strava, and more — synthesized daily by AI.

## Quick Links

- **[Product Spec](docs/product-spec.md)** — Full architecture and scope
- **[Trigger Regeneration](../../actions/workflows/regenerate.yml)** — Manual workflow dispatch

## Structure

```
generated/     ← Cursor edits this only
public/        ← Static assets (loading screen)
infra/         ← Protected fetchers and aggregator
data/          ← JSON payloads (identity + latest)
```

## Edit Boundaries

| Folder | Editable by Cursor? |
|--------|---------------------|
| `generated/` | Yes |
| `infra/` | No |
| `public/` | No |
| `data/` | No (updated by infra scripts) |

## Running Locally

```bash
# Smoke test
./scripts/smoke.sh

# Serve generated site (any static server)
npx serve generated
```

## Deployment

Vercel deploys from `generated/` + `public/`. The loading screen at `/loading/` provides a theatrical transition before showing the pre-built site.

