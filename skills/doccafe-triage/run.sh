#!/bin/zsh
# Daily DocCafe triage — OWNER-FACING ONLY. Reads DocCafe recruiter emails, screens them
# against ~/.jobhunt-kit/profile.yml, drafts replies, logs to the tracker, and texts the
# OWNER the queue. It is NOT allowed to email recruiters (send_message is not in allowedTools).
#
# Install as a launchd job to run daily — see setup/ or docs/SETUP.md. This script is generic;
# it reads all personal details from the profile at runtime.

export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
LOG="${HOME}/.jobhunt-kit/doccafe-run.log"
mkdir -p "${HOME}/.jobhunt-kit"
echo "===== run $(date) =====" >> "$LOG"

# Locate the claude CLI
CLAUDE_BIN="$(command -v claude || echo "$HOME/.local/bin/claude")"

"$CLAUDE_BIN" -p "Use the doccafe-triage skill. First read ~/.jobhunt-kit/profile.yml for the \
candidate profile, criteria, tracker sheet id, and the owner's own phone number. Triage today's \
NEW DocCafe recruiter emails (from:email.doccafe.com newer_than:1d) in the send account: screen \
each against the criteria, dedupe against the tracker, write a short DRAFT reply for every \
qualifying lead, log them to the tracker, then text the OWNER a one-line receipt of the queue at \
their own number via the SendText shortcut. DO NOT email any recruiter — only draft, log, and \
text the owner." \
  --allowedTools "mcp__google-mcp__list_messages,mcp__google-mcp__read_message,mcp__google-mcp__read_sheet,mcp__google-mcp__append_rows,mcp__google-mcp__update_cells,mcp__google-mcp__create_draft,Bash(shortcuts run:*)" \
  >> "$LOG" 2>&1

echo "===== done $(date) =====" >> "$LOG"
