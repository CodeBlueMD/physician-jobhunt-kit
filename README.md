# 🩺 physician-jobhunt-kit

**An AI job-search assistant for physicians, that runs entirely on your own machine and from your
own accounts.** It finds roles that fit your criteria, drafts personalized recruiter emails in your
voice with your CV attached, triages the recruiter emails that pile up in your inbox, and even texts
recruiters back — all as **drafts you approve**, never anything sent behind your back.

Built for **both IMGs (visa sponsorship needed) and US grads** — a single toggle turns all the
J-1/H-1B logic on or off.

> ⚕️ It's a drafting + organizing assistant. Every email and text is shown to you and only sent
> after you say so. You're always the one in control of what goes out under your name.

---

## What you get — three skills

| Skill | What it does |
|-------|--------------|
| **jobsearch** | Research physician roles that match your profile, find the real recruiter's email, draft a short warm inquiry with your CV attached, and track every outreach in a Google Sheet. Runs a "is this community welcoming?" check before applying. |
| **doccafe-triage** | Each morning, screen the [DocCafe](https://www.doccafe.com) recruiter emails in your inbox against your criteria, draft replies for the good ones, log them, and **text you the queue** to approve. Never emails a recruiter unattended. |
| **sendtext** *(macOS)* | Draft and send iMessage/SMS in *your* texting voice — professional for recruiters, casual for friends — and "catch me up on my texts." |

Everything is tailored by **one config file** (`~/.jobhunt-kit/profile.yml`): your name, CV, visa
situation, comp target, geography, and more. Change your search any time by editing it.

---

## Setup — two ways

### ⭐ Easiest: let Claude Code do it
1. Install [Claude Code](https://claude.com/claude-code).
2. Clone this repo and open it in Claude Code:
   ```bash
   git clone https://github.com/CodeBlueMD/physician-jobhunt-kit.git
   cd physician-jobhunt-kit
   claude
   ```
3. Say: **"Set up the job-hunt kit for me."**

Claude reads [`CLAUDE.md`](CLAUDE.md) and walks you through every step conversationally — opening the
right pages, checking your files, building your profile by just asking you questions. You'll only need
to do a couple of browser clicks (Google won't let anyone automate those for you).

### Manual: run the installer
```bash
git clone https://github.com/CodeBlueMD/physician-jobhunt-kit.git
cd physician-jobhunt-kit
./install.sh
```
It runs each step in order and pauses at the parts that need you. Full manual reference:
[`docs/SETUP.md`](docs/SETUP.md).

---

## The ~5-minute honest part
One step **can't** be automated by anyone: creating your personal **Google OAuth client** so the kit
can send email from *your* Gmail. It's ~5 minutes of clicking in Google Cloud Console, and it means
your credentials live only on your Mac — no shared server, no middleman. Step-by-step (with Claude
happy to walk you through it): [`docs/GOOGLE_OAUTH.md`](docs/GOOGLE_OAUTH.md).

## Requirements
- **macOS** (the email skills are cross-platform-ish, but the texting skill needs macOS Messages + Shortcuts)
- **Node.js 20+**
- **[Claude Code](https://claude.com/claude-code)** (the CLI)
- A **Google account** you send from, and your **CV as a PDF**

---

## Privacy & safety
- **Runs locally.** The bundled `google-mcp` server runs on your machine; your Google tokens never leave it.
- **Nothing personal is committed.** `credentials.json`, `.tokens/`, and `profile.yml` are gitignored.
- **You approve every send.** Skills draft, show you, and only send on your explicit "GO." The
  scheduled DocCafe run is locked to owner-facing tools — it literally cannot email a recruiter unattended.
- **Revocable any time** at [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

## How it's tailored
See [`docs/CRITERIA.md`](docs/CRITERIA.md). The short version: edit `~/.jobhunt-kit/profile.yml`.
The `visa.required` switch flips the whole IMG/visa track on or off; `criteria.*` is the screen every
lead is scored against.

## Repo layout
```
physician-jobhunt-kit/
├── CLAUDE.md              # ⭐ lets Claude Code drive the whole setup
├── install.sh            # manual one-shot installer
├── profile.example.yml   # the tailoring surface (copy → ~/.jobhunt-kit/profile.yml)
├── wizard.mjs            # interactive profile builder
├── setup/               # ordered, idempotent setup steps
├── docs/                # OAuth, shortcut, scheduling, criteria guides
├── skills/              # jobsearch · doccafe-triage · sendtext
└── google-mcp/          # bundled local Google MCP server (your secrets gitignored)
```

## License
MIT — see [`LICENSE`](LICENSE). Not affiliated with DocCafe, PracticeMatch, Doximity, Google, or any
employer/recruiter. You are responsible for everything sent under your name.
