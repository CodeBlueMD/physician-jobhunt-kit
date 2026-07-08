#!/usr/bin/env bash
# Prerequisite check. Exits non-zero if something required is missing.
set -euo pipefail
echo "▸ Checking prerequisites…"

fail=0
os="$(uname -s)"
if [[ "$os" != "Darwin" ]]; then
  echo "  ⚠ This kit is built for macOS. Email skills may work elsewhere, but the texting"
  echo "    half (SendText + Messages) is macOS-only."
fi

if command -v node >/dev/null 2>&1; then
  ver="$(node -v)"; major="${ver#v}"; major="${major%%.*}"
  if (( major >= 20 )); then echo "  ✓ node $ver"; else echo "  ✗ node $ver — need 20+"; fail=1; fi
else
  echo "  ✗ node not found — install Node 20+ (https://nodejs.org)"; fail=1
fi

command -v npx >/dev/null 2>&1 && echo "  ✓ npx" || { echo "  ✗ npx not found"; fail=1; }

if command -v claude >/dev/null 2>&1; then
  echo "  ✓ claude CLI ($(command -v claude))"
else
  echo "  ✗ claude CLI not found — install Claude Code (https://claude.com/claude-code)"; fail=1
fi

if (( fail )); then
  echo ""; echo "Fix the ✗ items above, then re-run."; exit 1
fi
echo "  All prerequisites OK."
