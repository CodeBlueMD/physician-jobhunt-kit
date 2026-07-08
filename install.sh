#!/usr/bin/env bash
# physician-jobhunt-kit — one-shot installer.
# Runs each setup step in order, pausing at the human-gated ones (Google OAuth, browser
# consent). Safe to re-run — every step is idempotent.
#
# Prefer letting Claude Code drive this instead? Open this repo in Claude Code and say
# "set up the job-hunt kit" — it reads CLAUDE.md and walks you through the same steps.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  physician-jobhunt-kit — setup                           ║"
echo "╚══════════════════════════════════════════════════════════╝"

bash setup/00_check.sh
bash setup/01_deps.sh

echo ""
echo "▸ Google OAuth client"
echo "  The kit sends email from YOUR Gmail via a small local server. That needs a Google"
echo "  OAuth client (a one-time ~5-min setup in Google Cloud Console)."
echo "  Full walkthrough: docs/GOOGLE_OAUTH.md"
if ! bash setup/02_validate_credentials.sh; then
  echo ""
  read -r -p "  Press Enter once you've placed credentials.json in google-mcp/ (or Ctrl-C to stop)… " _
  bash setup/02_validate_credentials.sh
fi

echo ""
bash setup/03_authenticate.sh

echo ""
echo "▸ Building your profile…"
node wizard.mjs

echo ""
bash setup/06_register.sh

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Almost done — a few things Claude finishes on first run  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo "  1. Restart Claude so it picks up the google-mcp server + skills."
echo "  2. In Claude:  /jobsearch   → on the first run it creates your tracker Google Sheet"
echo "     and writes the id into ~/.jobhunt-kit/profile.yml."
echo "  3. (Optional, macOS) For texting: build the SendText Shortcut — docs/SENDTEXT_SHORTCUT.md,"
echo "     then set texting.enabled: true in your profile."
echo "  4. (Optional) Schedule the daily DocCafe triage — docs/SETUP.md § Scheduling."
echo ""
echo "  Tune your search any time by editing ~/.jobhunt-kit/profile.yml. Happy hunting!"
