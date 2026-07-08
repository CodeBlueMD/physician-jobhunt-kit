---
name: doccafe-triage
description: >-
  Daily triage of DocCafe recruiter emails — screen each against the candidate's job
  criteria (from profile.yml), DRAFT replies for qualifying recruiters, log them to the
  tracker, and text the OWNER the queue to approve. It never emails a recruiter on its own;
  sends happen only after the owner says GO in a live session. macOS only (local google-mcp
  + CV + the SendText Shortcut). Does NOT browse the DocCafe website.
---

# doccafe-triage — screen DocCafe recruiter emails, draft, and queue for approval

Runs daily. Works ONLY off the recruiter EMAILS DocCafe pushes to the owner's Gmail — it never
browses/scrapes the DocCafe site (login-walled, no API). ([DocCafe](https://www.doccafe.com) is
a physician job board that emails you recruiter pitches; this skill triages those emails.)

## 0. Load the profile FIRST
Read **`~/.jobhunt-kit/profile.yml`**. Screen with `criteria.*`, decide visa handling from
`visa.*`, send from `identity.send_alias` with `identity.cv_path` attached, log to
`tracker.sheet_id`, and text receipts to `texting.your_number`.

## SAFETY MODEL (non-negotiable)
The scheduled run is **owner-facing only**: it reads email, screens, writes drafts, logs to the
sheet, and texts **the owner themselves** the queue. It must **NEVER auto-send an email to a
recruiter.** Outbound recruiter emails happen **only** when the owner is in a live session and
explicitly says "GO" (per-message human approval).

## Source
- Recruiter pitches: `from:email.doccafe.com` in the owner's inbox, `newer_than:1d`, deduped vs
  the tracker. Each pitch has the recruiter's REAL email + phone in the body — that's the reply target.
- Ignore digests `from:noreply@m.doccafe.com` for outreach (list them in the receipt only; the
  apply/details are behind the DocCafe login).

## The screen → from `criteria` (+ `visa`)
1. **Role** matches `criteria.target_roles`; outpatient only above `criteria.outpatient_ok_above_usd`;
   skip locums if `criteria.no_locums`.
2. **Comp ≥ `criteria.min_comp_usd`** real base (treat "income potential" / RVU-only as unverified
   → still QUEUE, but flag it).
3. **Visa** — only if `visa.required`: the role must support the candidate's `visa.situation`. It's
   a hard filter (still QUEUE if unstated, flagging "visa not confirmed"). If `visa.required: false`,
   ignore visa entirely.
4. **New-grad friendly** if `criteria.new_grad_friendly` (reject "5+ yrs experience" / board-only
   requirements the candidate doesn't meet).
5. **Location** per `criteria.geography` / `criteria.lifestyle`; run the welcome check spirit of the
   jobsearch skill if `criteria.welcome_check`.

## Decision tiers
- **QUEUE (draft + present for approval):** anything passing ROLE + COMP worth a reply. Flag what's
  unverified inside the draft (visa not stated, comp = "potential", location borderline).
- **SKIP:** locums, wrong specialty, low-pay outpatient, requirements the candidate doesn't meet,
  or a firm already in the tracker.

## Draft email (owner's voice; CV attached on send)
Build from the profile — same short, warm style as jobsearch §4:
"Hi [First name], thanks for reaching out about the [role] in [place]. I'm [training.summary],
targeting a [target_start] start. {{if visa.required}}Quick note up front — I'm on
[visa.situation]; could you confirm the role supports that?{{/if}} Could you share the base
salary, schedule, and exact location? My CV is attached. [identity.sign_off] · [email] · [phone]"

On the owner's GO: send via google-mcp `send_message` (`account_alias: identity.send_alias`),
`attachments: [{ path: identity.cv_path }]`, subject `Re: <their subject>`.

## Tracker (shared with jobsearch, auto-created)
Use the same Google Sheet as `jobsearch` (`tracker.sheet_id`). If it's blank, create it with
`create_sheet` (same 10-column header) and write the id back into `~/.jobhunt-kit/profile.yml`.
Log every DocCafe send as a row (channel "📧 DocCafe"). Bounces + no-reply follow-ups are handled by
the same failed-response routine as jobsearch §5b. If a pitch has no usable recruiter email, apply
the same OSINT ladder / HR-inbox escalation.

## Dedupe + recency check (MANDATORY before queueing or sending)
1. Check the tracker (`tracker.sheet_id`) for the recruiter email OR firm. Already present → SKIP
   (or treat as a follow-up, not fresh outreach).
2. Check **both channels** for prior contact: Gmail sent (`in:sent to:<email>`) AND texts (if
   `texting.enabled`, the last outbound to that number). If contacted within ~5 days or awaiting a
   reply → do NOT send; flag it with the date/channel. (Avoids double-contacting across channels.)
After a send, append a tracker row (channel "📧 DocCafe").

## FINAL CHECKPOINT before sending (MANDATORY — never skip)
Assume nothing, verify everything. Before any send:
1. **Read the FULL source email, never a snippet/preview.** (A truncated preview once got misread
   and a false claim went out under the owner's name.)
2. **Every fact in the draft must be literally in the source** — comp, openings, location, role,
   names. If inferred, don't state it as fact; ask or omit.
3. **Recipient + context match** — right recruiter, right address, draft fits THIS job/thread.
4. **Recency/dedup** (above) cleared.
5. Show the owner what you verified and get explicit OK.

## Daily receipt (owner-facing) — via SendText (macOS)
Text the owner a one-line queue at `texting.your_number` (only if `texting.enabled`):
`echo "<your_number>|DocCafe AM: N leads to approve — [firm/role list] · skipped K. Reply here or open Claude to send." | shortcuts run "SendText"`

## Scheduling
A launchd job (see `setup/` / `run.sh`) runs `claude -p` headless daily with this skill and
**owner-facing tools only** (`list_messages`, `read_message`, `read_sheet`, `append_rows`,
`update_cells`, `create_draft`, and Bash for SendText to the owner's own number). It is NOT
allowed to `send_message` to anyone but the owner's own number. Pairs with `jobsearch` + `sendtext`.
