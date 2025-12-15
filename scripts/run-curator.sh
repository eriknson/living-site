#!/bin/bash
set -e

echo "=== Curator Agent ==="
echo "Synthesizing data into creative direction..."
echo ""

# Create clean worktree for curator (isolation)
WORKTREE_DIR="/tmp/curator-workspace"
rm -rf "$WORKTREE_DIR"
git worktree add "$WORKTREE_DIR" --detach HEAD 2>/dev/null || true

# Copy fresh data to worktree
cp data/latest.json "$WORKTREE_DIR/data/latest.json"

# Ensure curator output directory exists
mkdir -p "$WORKTREE_DIR/data"

# Remove any existing brief so agent starts fresh
rm -f "$WORKTREE_DIR/data/brief.json"

echo "Running curator agent in isolated workspace..."
echo ""

# Build the prompt
PROMPT="Read infra/prompts/curator.md for your instructions.
Read data/latest.json for the raw data.

Create data/brief.json with your curated synthesis.
Output only the JSON file, no explanation needed."

# Run cursor-agent
cd "$WORKTREE_DIR"
cursor-agent -p --force --model composer-1 "$PROMPT" 2>&1 || true

# Check if brief was created
if [ ! -f "$WORKTREE_DIR/data/brief.json" ]; then
  echo "ERROR: Curator agent did not create data/brief.json"
  git worktree remove "$WORKTREE_DIR" --force 2>/dev/null || true
  exit 1
fi

# Copy brief back to main workspace
cp "$WORKTREE_DIR/data/brief.json" data/brief.json

# Cleanup worktree
cd - > /dev/null
git worktree remove "$WORKTREE_DIR" --force 2>/dev/null || true

echo ""
echo "=== Brief Output ==="
cat data/brief.json
echo ""
echo "✓ Curator synthesis complete"

