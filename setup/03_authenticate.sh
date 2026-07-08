#!/usr/bin/env bash
# Authenticate one or more Google accounts. Each opens a browser consent once.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/google-mcp"

echo "▸ Authenticating Google account(s)."
echo "  You'll pick a short alias per account (e.g. 'personal', 'work'). A browser opens;"
echo "  sign in, click Continue past the 'app isn't verified' screen (it's your own app),"
echo "  and grant access. Use the SAME alias in your profile.yml as identity.send_alias."
echo ""

while true; do
  read -r -p "  Alias to authenticate (blank to finish): " alias
  [[ -z "$alias" ]] && break
  echo "  → Opening browser for '$alias'…"
  npm run auth -- --alias "$alias" || { echo "  ✗ auth failed for '$alias' — try again."; continue; }
  if [[ -f ".tokens/$alias.json" ]]; then
    echo "  ✓ Authenticated '$alias' (.tokens/$alias.json)"
  else
    echo "  ✗ No token saved for '$alias' — did the browser flow complete?"
  fi
done

if ls .tokens/*.json >/dev/null 2>&1; then
  echo "  ✓ Authenticated accounts: $(ls .tokens/*.json | xargs -n1 basename | sed 's/\.json//' | paste -sd', ' -)"
else
  echo "  ⚠ No accounts authenticated yet. Re-run this step before using the skills."
fi
