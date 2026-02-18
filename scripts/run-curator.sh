#!/bin/bash
set -e

echo "=== Curator Agent ==="
echo "Synthesizing data into brief + semantic reference..."
echo ""

# Create clean worktree for curator (isolation)
WORKTREE_DIR="/tmp/curator-workspace"
rm -rf "$WORKTREE_DIR"
git worktree add "$WORKTREE_DIR" --detach HEAD 2>/dev/null || true

# Ensure directories exist
mkdir -p "$WORKTREE_DIR/data"

# Copy fresh data to worktree
cp data/latest.json "$WORKTREE_DIR/data/latest.json"

# Fetch styled page if not already present
if [ ! -f "data/styled-page.html" ]; then
  echo "Fetching styled page from live site..."
  curl -sL "https://eriks.design" -o data/styled-page.html
  echo "✓ Saved data/styled-page.html"
  echo ""
fi
cp data/styled-page.html "$WORKTREE_DIR/data/styled-page.html"

# Remove any existing outputs so agent starts fresh
rm -f "$WORKTREE_DIR/data/brief.json"
rm -f "$WORKTREE_DIR/data/reference.html"

echo "Running curator agent in isolated workspace..."
echo ""

# Build the prompt
PROMPT="Read infra/prompts/curator.md for your instructions.

Task 1: Read data/latest.json → Write data/brief.json
Task 2: Read data/styled-page.html → Write data/reference.html (semantic version)"

# Run cursor-agent
cd "$WORKTREE_DIR"
cursor-agent -p --force --model composer-1.5 "$PROMPT" 2>&1 || true

# Check if brief was created
if [ ! -f "$WORKTREE_DIR/data/brief.json" ]; then
  echo "ERROR: Curator agent did not create data/brief.json"
  git worktree remove "$WORKTREE_DIR" --force 2>/dev/null || true
  exit 1
fi

# Copy outputs back to main workspace
cp "$WORKTREE_DIR/data/brief.json" data/brief.json
echo "=== Brief Output ==="
cat data/brief.json
echo ""

if [ -f "$WORKTREE_DIR/data/reference.html" ]; then
  cp "$WORKTREE_DIR/data/reference.html" data/reference.html
  echo "=== Reference HTML (first 20 lines) ==="
  head -20 data/reference.html
else
  echo "⚠ Curator did not create reference.html, creating fallback..."
  cat > data/reference.html << 'FALLBACK'
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Erik Nilsson</title></head>
<body>
<main>
<p>Designer at <a href="https://cursor.com">Cursor</a>, making tools for building software with AI.</p>
<ul>
<li><a href="https://x.com/flowstated">Follow on X</a></li>
<li><a href="mailto:contact@eriks.design">Send an email</a></li>
<li><a href="https://github.com/eriknson">GitHub</a></li>
</ul>
</main>
</body>
</html>
FALLBACK
fi

# Cleanup worktree
cd - > /dev/null
git worktree remove "$WORKTREE_DIR" --force 2>/dev/null || true

echo ""
echo "✓ Curator synthesis complete"
