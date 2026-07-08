#!/usr/bin/env bash
# Validate that google-mcp/credentials.json exists and looks like a real OAuth client.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CRED="$ROOT/google-mcp/credentials.json"

echo "▸ Checking your Google OAuth client (credentials.json)…"
if [[ ! -f "$CRED" ]]; then
  cat <<EOF
  ✗ Not found: $CRED

  You need to create a Google OAuth client and download it here. It takes ~5 minutes:
    → Full step-by-step: docs/GOOGLE_OAUTH.md
    → Short version: console.cloud.google.com → new project → enable Gmail/Calendar/Drive/
      Sheets APIs → OAuth consent screen (External, add your email as a Test User) →
      Credentials → Create OAuth client ID → Desktop app → Download JSON →
      rename to 'credentials.json' → move it to: $ROOT/google-mcp/

  (Tip: if you're doing this with Claude Code, just say "walk me through the Google OAuth setup".)
EOF
  exit 1
fi

# Shape check without printing any secret values
node -e '
  const fs=require("fs");
  const p=process.argv[1];
  let d; try{ d=JSON.parse(fs.readFileSync(p,"utf8")); }catch(e){ console.error("  ✗ credentials.json is not valid JSON."); process.exit(1); }
  const c=d.installed||d.web;
  if(!c){ console.error("  ✗ Expected an \"installed\" (Desktop app) OAuth client. Re-download as Application type = Desktop app."); process.exit(1); }
  const need=["client_id","client_secret"];
  for(const k of need){ if(!c[k]||String(c[k]).includes("YOUR_")){ console.error("  ✗ Missing/placeholder "+k+" — this looks like the example file, not your real client."); process.exit(1); } }
  if(!/apps\.googleusercontent\.com$/.test(c.client_id)){ console.error("  ✗ client_id does not look like a Google OAuth client id."); process.exit(1); }
  console.log("  ✓ credentials.json looks valid (Desktop OAuth client).");
' "$CRED"
