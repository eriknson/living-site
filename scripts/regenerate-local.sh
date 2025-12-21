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

# Build the prompt (inline system.md + brief + identity, reference HTML only)
SYSTEM_PROMPT=$(cat infra/prompts/system.md)
BRIEF=$(cat data/brief.json)
IDENTITY=$(cat data/identity.json)

PROMPT="${SYSTEM_PROMPT}

---

## Editorial Brief (today's context)
${BRIEF}

## Identity
${IDENTITY}

Read fly-context/reference.html for design reference.
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

