# Manual setup & scheduling

The fastest paths are the automated ones — either **`./install.sh`** or opening the repo in
Claude Code and saying *"set up the job-hunt kit."* This doc is the manual reference plus the one
thing the installer leaves optional: **scheduling the daily DocCafe triage.**

## Manual setup (what install.sh does, by hand)
1. **Prereqs:** Node 20+, `npx`, and the [Claude Code](https://claude.com/claude-code) CLI.
2. **Deps:** `cd google-mcp && npm install`
3. **Google OAuth:** follow **[GOOGLE_OAUTH.md](GOOGLE_OAUTH.md)** → `google-mcp/credentials.json`
4. **Authenticate:** `bash setup/03_authenticate.sh` (one alias per account)
5. **Profile:** `node wizard.mjs` → writes `~/.jobhunt-kit/profile.yml` (or copy
   `profile.example.yml` there and edit by hand)
6. **Register + install skills:** `bash setup/06_register.sh`
7. **Restart Claude.** First `/jobsearch` run creates your tracker Google Sheet.
8. **(Optional) Texting:** [SENDTEXT_SHORTCUT.md](SENDTEXT_SHORTCUT.md), then `texting.enabled: true`.

## Scheduling the daily DocCafe triage (macOS launchd)
The `doccafe-triage` skill can run every morning: it screens overnight DocCafe recruiter emails,
drafts replies, logs them, and **texts you** the queue to approve. It never emails a recruiter on
its own.

1. Make the runner executable:
   ```bash
   chmod +x ~/.claude/skills/doccafe-triage/run.sh
   ```
2. Create `~/Library/LaunchAgents/com.jobhunt.doccafe.plist` (edit the path to `run.sh` if your
   skills live elsewhere; `~` won't expand inside the plist — use the absolute path):
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
     "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0"><dict>
     <key>Label</key><string>com.jobhunt.doccafe</string>
     <key>ProgramArguments</key>
     <array>
       <string>/bin/zsh</string>
       <string>/Users/YOU/.claude/skills/doccafe-triage/run.sh</string>
     </array>
     <key>StartCalendarInterval</key>
     <dict><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer></dict>
     <key>StandardOutPath</key><string>/tmp/jobhunt-doccafe.out</string>
     <key>StandardErrorPath</key><string>/tmp/jobhunt-doccafe.err</string>
   </dict></plist>
   ```
3. Load it:
   ```bash
   launchctl load ~/Library/LaunchAgents/com.jobhunt.doccafe.plist
   ```
4. Test immediately:
   ```bash
   launchctl start com.jobhunt.doccafe
   tail -f ~/.jobhunt-kit/doccafe-run.log
   ```
   You should get a text with the morning's queue. To stop: `launchctl unload …/com.jobhunt.doccafe.plist`.

> **Safety:** the scheduled run is owner-facing only — its `--allowedTools` (in `run.sh`) exclude
> `send_message`, so it physically cannot email a recruiter unattended. Recruiter emails only go
> out when you're in a live Claude session and say "GO."

## Uninstall
- Remove skills: `rm -rf ~/.claude/skills/{jobsearch,doccafe-triage,sendtext}`
- Remove MCP server: `claude mcp remove google-mcp`
- Remove your data: `rm -rf ~/.jobhunt-kit`
- Revoke Google access: https://myaccount.google.com/permissions
- Delete the tracker Sheet from your Drive if you want.
