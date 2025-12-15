#!/bin/bash
set -e

# Default to composer-1, or use provided model
MODEL="${1:-composer-1}"
DATE=$(date -u +%Y-%m-%d)

echo "=== Local Regeneration ==="
echo "Model: $MODEL"
echo "Date: $DATE"
echo ""

# Skip aggregation - use existing committed data
echo "Using existing data/latest.json (skipping aggregation)"
echo ""

# Run curator agent if brief.json doesn't exist or is older than latest.json
if [ ! -f "data/brief.json" ] || [ "data/latest.json" -nt "data/brief.json" ]; then
  echo "=== Running Curator Agent ==="
  npm run curator
  echo ""
else
  echo "Using existing data/brief.json"
  echo ""
fi

# Clear existing build for this model
rm -f "generated/${MODEL}.html"

# Build the prompt (inline system.md, then reference supporting files)
SYSTEM_PROMPT=$(cat infra/prompts/system.md)
PROMPT="${SYSTEM_PROMPT}

---

For data and context, read:
- .cursor/rules/site-generation/context.md — voice and data sources
- .cursor/rules/site-generation/website-guidelines.md — design guardrails
- data/brief.json — curator's editorial brief
- data/latest.json — raw data
- data/identity.json — contact links

Create generated/${MODEL}.html"

echo "=== Running cursor-agent ==="
cursor-agent -p --force --model "$MODEL" --output-format stream-json "$PROMPT" > /tmp/build-output.json 2>&1 || true

# Check if generation succeeded
if [ ! -f "generated/${MODEL}.html" ]; then
  echo "ERROR: No HTML generated"
  exit 1
fi

echo ""
echo "=== Saving build ==="

# save-build-log handles:
# - Copying HTML to timestamped path: public/builds/{date}/{model}-{timestamp}.html
# - Updating history.json with agent logs
# - Updating manifest.json with batch structure
npm run save-build-log -- /tmp/build-output.json --model "$MODEL" --date "$DATE"

echo ""
echo "=== Done ==="
echo "Run 'git add -A && git commit -m \"Local build: ${MODEL}\"' to commit"

