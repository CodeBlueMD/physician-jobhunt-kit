# CLAUDE.md — setup guide for Claude Code

**If you are Claude Code and a user has opened this repo, your job is to set this kit up FOR them,
conversationally, one step at a time.** Most users will never touch the terminal directly — they'll
say something like *"set this up for me"* and expect you to drive. Do exactly that. Be warm, go one
step at a time, wait for confirmation between steps, and never dump all the instructions at once.

If the user hasn't said anything yet, greet them and offer:
> "This kit gives you three job-hunt skills — find physician jobs & draft recruiter emails, triage
> DocCafe recruiter emails daily, and text recruiters in your own voice. I can set it all up with
> you now (~5–10 min, mostly me; you'll do a couple of clicks in your browser). Want to start?"

---

## What this kit is
Three Claude skills for a physician job search, all sending/acting **only from the user's own
accounts** and **only after they approve each message**:
- **jobsearch** — research roles, draft personalized recruiter emails with the CV attached, track them.
- **doccafe-triage** — daily screen of DocCafe recruiter emails → drafts + a queue texted to the owner.
- **sendtext** (macOS) — draft/send iMessage in the owner's voice.

They read one config file, **`~/.jobhunt-kit/profile.yml`**, for who the user is and what they want.
Email/Drive/Sheets go through a bundled local MCP server (`google-mcp/`). Nothing leaves their machine
except the emails/texts they explicitly approve.

## Golden rules (state these to the user, and follow them)
1. **Never send anything without explicit per-message approval.** Draft → show → they say GO → send.
2. **Nothing personal gets committed.** `credentials.json`, `.tokens/`, and `profile.yml` are gitignored.
3. **Verify, don't assume.** When drafting from a recruiter email, read the FULL source; every fact
   in a draft must be literally in the source.

---

## Setup playbook — do these in order, pausing for the user each time

### Step 0 — Prereqs
Run `bash setup/00_check.sh`. If Node 20+ / npx / the claude CLI are missing, help the user install
them before continuing. (macOS is assumed; the texting skill is macOS-only.)

### Step 1 — Dependencies
Run `bash setup/01_deps.sh` (installs the MCP server's npm deps). Quick, no user action.

### Step 2 — Google OAuth (the one part they must click through)
The kit sends email from the user's Gmail via the local server, which needs a personal Google OAuth
client. Walk them through **docs/GOOGLE_OAUTH.md** interactively:
- Offer to open each page for them. Explain each step in one or two sentences; don't paste the whole doc.
- The steps: create a Google Cloud project → enable Gmail + Calendar + Drive + Sheets APIs → OAuth
  consent screen (**External**, add their email as a **Test User** — this is the #1 gotcha) → create
  an **OAuth client ID → Desktop app** → Download JSON → rename to `credentials.json` → put it in `google-mcp/`.
- Then run `bash setup/02_validate_credentials.sh` and confirm it passes before moving on.
- Reassure them: the file stays on their Mac, is gitignored, and access is revocable at
  myaccount.google.com/permissions.

### Step 3 — Authenticate their account(s)
Run `bash setup/03_authenticate.sh`. Tell them: pick a short alias (e.g. `personal`), a browser
opens, click **Continue** past "app isn't verified" (it's their own app), grant access. Note the
alias they chose — it becomes `identity.send_alias` in the profile.

### Step 4 — Build their profile
You can either run `node wizard.mjs`, OR — usually nicer — **gather the answers conversationally**
and write `~/.jobhunt-kit/profile.yml` yourself (use `profile.example.yml` as the schema). Ask for:
- Name (as in signatures), first name, the email they'll send from + its alias, cell (E.164), CV path.
- A one-line self-intro, graduation + target-start dates.
- **Visa: do they need sponsorship?** (IMG on a training visa → `required: true` + their situation +
  a subject tag; US grad/citizen/GC → `required: false` and all visa content disappears.)
- Criteria: specialty/ies, target roles, min base comp, geography (states or "any"), whether to run
  the community-welcome check.
- Texting: enable it? If yes, their own cell for receipts.
Confirm the CV path actually exists (`ls` it). Show them the finished profile and let them correct it.

### Step 5 — Register + install
Run `bash setup/06_register.sh` (registers the MCP server at user scope + copies the three skills to
`~/.claude/skills/`). Tell the user to **restart Claude** so it loads the server and skills.

### Step 6 — Create the tracker (after restart, once the MCP is live)
On the first jobsearch use (or now, if the server is loaded), create their tracker Google Sheet with
the google-mcp tools: a sheet named per `tracker.sheet_name` with header row
`# | Employer | Location | State | Role | Recipient | Confidence | Status | Date Sent | Welcome`,
then write its id into `tracker.sheet_id` in the profile.

### Step 7 — Texting shortcut (optional, only if texting enabled)
Walk them through **docs/SENDTEXT_SHORTCUT.md** to build the `SendText` Shortcut (4 actions), then
test it with their own number. Remind them to grant Full Disk Access to their terminal so the skill
can read Messages for "catch me up."

### Step 8 — Scheduling (optional)
Offer to set up the daily DocCafe triage via launchd (**docs/SETUP.md § Scheduling**). Emphasize it's
owner-facing only — it can't email recruiters unattended.

### Done
Summarize what's set up and how to use it: `/jobsearch`, `/doccafe-triage`, `/sendtext`, and that they
tune everything by editing `~/.jobhunt-kit/profile.yml`. Remind them you'll always draft-and-confirm
before sending anything.

---

## If the user just wants to *use* it (already set up)
Point them at the skill that fits: finding jobs / drafting recruiter emails → **jobsearch**; triaging
DocCafe emails → **doccafe-triage**; texting a recruiter or "catch me up on my texts" → **sendtext**.
Always load `~/.jobhunt-kit/profile.yml` first, and always draft → confirm → send.
