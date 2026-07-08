#!/usr/bin/env bash
# Register the google-mcp server with Claude and install the three skills.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS_DEST="$HOME/.claude/skills"

echo "▸ Registering the google-mcp server with Claude (user scope)…"
INDEX="$ROOT/google-mcp/src/index.ts"
if command -v claude >/dev/null 2>&1; then
  if claude mcp list 2>/dev/null | grep -q "google-mcp"; then
    echo "  ✓ google-mcp already registered."
  elif claude mcp add google-mcp -s user -- npx tsx "$INDEX" 2>/dev/null; then
    echo "  ✓ Registered google-mcp."
  else
    cat <<EOF
  ⚠ Couldn't auto-register. Add it manually — run:
      claude mcp add google-mcp -s user -- npx tsx "$INDEX"
    or add this to your Claude MCP config:
      "google-mcp": { "command": "npx", "args": ["tsx", "$INDEX"] }
EOF
  fi
else
  echo "  ✗ claude CLI not found — install Claude Code, then re-run this step."
fi

echo "▸ Installing skills into $SKILLS_DEST …"
mkdir -p "$SKILLS_DEST"
for s in jobsearch doccafe-triage sendtext; do
  rm -rf "${SKILLS_DEST:?}/$s"
  cp -R "$ROOT/skills/$s" "$SKILLS_DEST/$s"
  echo "  ✓ installed /$s"
done
chmod +x "$SKILLS_DEST/doccafe-triage/run.sh" 2>/dev/null || true
echo "  Done. Restart Claude, then try:  /jobsearch"
