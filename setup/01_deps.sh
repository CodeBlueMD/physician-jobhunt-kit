#!/usr/bin/env bash
# Install the google-mcp server's dependencies.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "▸ Installing google-mcp dependencies…"
cd "$ROOT/google-mcp"
npm install --no-fund --no-audit
echo "  ✓ Dependencies installed."
