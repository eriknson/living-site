#!/usr/bin/env bash
set -e

echo "=== Living Site Smoke Test ==="

# Check required files exist
echo "Checking required files..."

files=(
  "data/identity.json"
  "data/latest.json"
  "public/loading/index.html"
  "public/loading/styles.css"
  "docs/product-spec.md"
  "infra/prompts/system.md"
  "infra/aggregator.ts"
  "infra/save-build-log.ts"
  "infra/fetchers/github.ts"
)

for file in "${files[@]}"; do
  if [[ -f "$file" ]]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (missing)"
    exit 1
  fi
done

# Validate JSON files
echo "Validating JSON..."
for json in data/*.json; do
  if python3 -m json.tool "$json" > /dev/null 2>&1; then
    echo "  ✓ $json"
  else
    echo "  ✗ $json (invalid JSON)"
    exit 1
  fi
done

echo ""
echo "All checks passed."

