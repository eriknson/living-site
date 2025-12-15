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

# Remove any existing curator output so agent starts fresh
rm -f "$WORKTREE_DIR/data/curator.json"

echo "Running curator agent in isolated workspace..."
echo ""

# Build the prompt
PROMPT="Read infra/prompts/curator.md for your instructions.
Read data/latest.json for the raw data.

Create data/curator.json with your curated synthesis.
Output only the JSON file, no explanation needed."

# Run cursor-agent
cd "$WORKTREE_DIR"
cursor-agent -p --force --model composer-1 "$PROMPT" 2>&1 || true

# Check if curator output was created
if [ ! -f "$WORKTREE_DIR/data/curator.json" ]; then
  echo "ERROR: Curator agent did not create data/curator.json"
  git worktree remove "$WORKTREE_DIR" --force 2>/dev/null || true
  exit 1
fi

# Copy curator output back to main workspace
cp "$WORKTREE_DIR/data/curator.json" data/curator.json

# Cleanup worktree
cd - > /dev/null
git worktree remove "$WORKTREE_DIR" --force 2>/dev/null || true

echo ""
echo "=== Curator Output ==="
cat data/curator.json
echo ""
echo "✓ Curator synthesis complete"

