#!/bin/bash
set -e

# Default to composer-1, or use provided model
MODEL="${1:-composer-1}"
DATE=$(date -u +%Y-%m-%d)

echo "=== Local Regeneration ==="
echo "Model: $MODEL"
echo "Date: $DATE"
echo ""

# Skip aggregation - use existing committed data for curator
echo "Using existing data/latest.json for curator (skipping aggregation)"
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

# Build the prompt
SYSTEM_PROMPT=$(cat infra/prompts/system.md)

PROMPT="${SYSTEM_PROMPT}

---

Reference: fly-context/reference.html
Today: data/brief.json

Output: generated/${MODEL}.html"

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

