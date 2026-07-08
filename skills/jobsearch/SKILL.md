---
name: jobsearch
description: >-
  Physician job-search workflow. Finds roles that match the candidate's fixed
  lifestyle + compensation profile (loaded from profile.yml), drafts personalized,
  in-their-voice Gmail inquiry emails addressed to real (verified or pattern-inferred)
  recruiters with the CV attached, and maintains an email tracker. Use whenever the
  user asks to find physician jobs, add locations, draft/refresh recruiter emails,
  chase down recruiter contacts, or update the job tracker.
---

# jobsearch — Physician Job Search Assistant

A reusable workflow for a physician's attending job search. **Everything specific to the
user lives in their profile — this file is generic.**

## 0. Load the profile FIRST (every run)
Read **`~/.jobhunt-kit/profile.yml`**. Use its values verbatim: `identity.*` in every
signature, `criteria.*` as the screen, `visa.*` to decide whether visa logic applies,
`tracker.sheet_id` for logging. If the file is missing, tell the user to run the setup
(`install.sh` or "ask Claude to set up the kit") and stop. If a needed field is blank, ask.

Send email through the local **google-mcp** server: `send_message` with
`account_alias: <identity.send_alias>` and the CV attached by path
(`attachments: [{ path: <identity.cv_path> }]`). `create_draft` exists but cannot attach a
file — so we **send-on-confirm** rather than draft.

## 1. Candidate profile → from `identity` + `training`
Build the signature and self-intro from the profile. Default sign-off is short and casual
(`identity.sign_off` + email · phone). Only use a formal block if the user explicitly asks.

## 2. The screen → from `criteria` (+ `visa`)
Score each location out of 10 against `criteria.*`; rank most→least. All must hold unless
the user changes them:
- **Role** matches `criteria.target_roles`; new-grad-friendly if `criteria.new_grad_friendly`
  (flag postings demanding years of prior attending/ED experience — not a fit for a new grad).
- **Comp ≥ `criteria.min_comp_usd`** (outpatient only above `criteria.outpatient_ok_above_usd`).
  Report comp honestly with a confidence per row; don't imply a number the source doesn't state.
  If `criteria.no_income_tax_states_preferred`, note take-home in no-tax states (TN, TX, FL, …).
- **Geography** = `criteria.geography` (may be `["any"]`); **climate/lifestyle** per profile.
- **`criteria.no_locums`** → skip locums if true.

### VISA — only if `visa.required: true`
When `visa.required` is **true**, this is the tightest filter:
- Confirm the employer sponsors the candidate's visa **on the actual posting**, not a filter
  label. No sponsorship → **don't apply.**
- Disclose it upfront in every email (its own standalone **bold** line — see §4) and tag the
  subject with `visa.subject_tag` so non-sponsors self-screen before they open the CV.
- Flag the structural tension: training-visa waivers cluster in rural/underserved sites, while
  diverse-metro EM roles usually demand 2–3 yrs prior ED experience (disqualifying for a new
  grad). When the user wants diverse metros, **hospitalist is the higher-yield lever.**

When `visa.required: false`, **omit every visa mention** — no subject tag, no visa line, no
sponsorship filter. (Do not invent one.)

## 3. Workflow
1. **Research** with WebSearch / WebFetch. For each location confirm role eligibility, comp,
   lifestyle fit — and visa sponsorship *if required*. Good sources: health systems that host
   residencies in the candidate's specialty (they hire their own grads), physician-owned /
   community groups, and job boards like **PracticeMatch** (`job-details` pages print the
   recruiter name + email and, when relevant, an explicit visa-accepted field — **verify each
   posting; board filters are unreliable**). Watch for staffing-firm duplicates that route many
   postings to one inbox (send once, not per site).
2. **Welcome / "is it welcoming?" check** — run automatically for every candidate location
   **if `criteria.welcome_check: true`.** The goal is *welcomeness*, not diversity per se. Run
   2–4 quick lookups and score 🟢/🟡/🔴:
   - 🟢 Strongest positive: international/IMG physicians already on the employer's medical staff
     **and staying** (tenure = the community works for someone like the user).
   - 🔴 Direct red flags: FBI/state hate-crime data + SPLC hate-group map for the county; news
     search "[town] racist incident / hate crime"; city subreddit "[town] as a minority/immigrant."
   - Welcoming signals (count even if not diverse): refugee-resettlement office, "Welcoming
     America" designation, cultural festivals, a temple/mosque/international grocery.
   - Diversity (census % foreign-born) is **context only** — a low number is not disqualifying.
   - Gate: 🟢 → apply · 🟡 thin signal → apply but tell the user "couldn't strongly verify — ask
     at interview" · 🔴 documented hostility → **do NOT apply without flagging to the user first.**
   - Honest limit: small-town data is noisy; *absence* of incidents ≠ safe. Gold standard = talk
     to a current international physician on staff; suggest the user ask the recruiter to connect them.
3. **Find the recipient email** — never fabricate a "verified" contact. Walk this ladder top→down
   and stop at the first that yields a usable address:
   - ✅ **Verified:** the recruiter's email printed on the official posting / recruitment page / in
     the user's own sent mail. Confirm with WebFetch on the source page (search summaries sometimes
     *guess* emails — verify against the real page).
   - 🔶 **OSINT-inferred (do this whenever there's no verified email):** actively construct a likely
     address instead of giving up.
     1. Get the org's real mail **domain** (their website / careers page).
     2. Determine the **email format** — search `"<domain>" email format` (RocketReach / LeadIQ /
        mailmo), or reverse-engineer it from ANY known address on the site (a press/contact/"info@"
        address usually reveals the pattern), or from the user's own sent mail to that domain.
     3. Build candidates from the recruiter's name in likely order:
        `first.last@`, `flast@`, `firstl@`, `first_last@`, `first@`, `lastf@`. Cross-check any
        redacted hints (ZoomInfo/Apollo "b***@…") to rank them.
     4. **Label it 🔶 inferred + confidence** and send to the **single most likely** candidate
        (not all at once — that looks like spam and burns the domain). If it bounces, the
        failed-response check (§5b) automatically retries the next permutation, up to
        `outreach.max_email_guesses`.
   - 📥 **Recruiter → HR / general inbox (escalation):** if no individual can be found or the guesses
     are exhausted, and `outreach.escalate_to_hr` is true, fall back to a **verified** general
     recruiting inbox — look for `physicianrecruitment@`, `providerrecruitment@`, `recruiting@`,
     `careers@`, `hr@`, or the address on the "Careers / Provider Opportunities" page. Address it to
     "Hi there," / "Hello Physician Recruitment,". This is how you reach HR when there's no named recruiter.
   - 🌐 **Portal only:** if the employer publishes no email at all (some large systems), address the
     draft to the user as a template and note the application URL; a recruiter is assigned after applying.
4. **Build one email per location**, addressed to the best available recipient (§4), and
   **send with google-mcp `send_message`** (alias = `identity.send_alias`, CV attached by path).
   `send_message` dispatches immediately → present the full list and send only on the user's go-ahead.
5. **Confidence-label** every recipient in your summary (✅ / 🔶 high / 🔶 medium / 📥 / 🌐).
6. **Update the tracker** (§5).

## 4. Email template — SHORT & WARM (house style)
A short, first-person, conversational note — NOT a formal "Dear Ms. X / I hold an MD…" letter.

```
Hi [First name — or "Hi there," if unknown],

I'm [first_name] — [training.summary], looking to start [ROLE] around [target_start].

[1–2 tailored, casual sentences: why THIS place fits (schools / outdoors / family) + a direct
question — do you take [specialty]-trained physicians for [the hospitalist / ED] role at
[facility], and is anything opening for [year]?]

{{VISA LINE — include ONLY if visa.required}}

CV's attached — would love to learn more.

[identity.sign_off]
[email] · [phone]
```

- **[ROLE]** must match the actual posting — hospitalist → "as a hospitalist"; FM-eligible ED →
  "in the ER / emergency medicine"; either → "as a hospitalist or in the ER, given my background."
  Mirror it in the direct question and the subject line.
- **Subject:** role-matched, e.g. `FM hospitalist, [year] — [Name]`. If `visa.required`, append
  the `visa.subject_tag`, e.g. `FM hospitalist, [year] (J-1 visa) — [Name]`.
- **Visa line (only if required)** = its own standalone **bold** line, e.g.
  `**Quick note up front — I'm on a J-1 and would need a J-1 waiver + H-1B sponsorship**, so I'm
  focusing on employers set up to support that.` Send via `html_body` so it renders bold, and
  ALWAYS include the plain-text `body` as fallback. **Never use red font** (reads as a warning).
  - ⚠️ `html_body` must be RAW HTML, never HTML-escaped entities. `&lt;b&gt;` shows literal tags
    in Gmail. If unsure, SKIP `html_body` — plain text always renders and only loses the bold.
  - ⚠️ After every `html_body` send, `read_message` the returned id and confirm there are no
    literal `<p>`/`&lt;` artifacts BEFORE reporting "sent."
- Use contractions and a natural voice; don't append a formal title block.

## 5. Tracker (auto-created)
- Live master = the Google Sheet at `tracker.sheet_id`. **If `tracker.sheet_id` is blank, CREATE it
  now** with google-mcp `create_sheet`:
  `create_sheet(account_alias=<send_alias>, title=<tracker.sheet_name>, tab_title="Tracker",
  header=["#","Employer","Location","State","Role","Recipient","Confidence","Status","Date Sent","Welcome"])`.
  Then **write the returned `spreadsheet_id` back into `tracker.sheet_id` in `~/.jobhunt-kit/profile.yml`**
  so it's reused forever after. Tell the user the sheet's URL. (Never create a second tracker if one
  already exists — read the id from the profile first.)
- Columns (A–J): `#, Employer, Location, State, Role, Recipient, Confidence, Status, Date Sent,
  Welcome`. Column J = Welcome (🟢/🟡/🔴 + reason) from step 2 — fill on every new row.
- **Edit in place — don't regenerate.** `append_rows` for new sends, `update_cells` to flip a
  row's Status/Date Sent. Read current state with `read_sheet`.
- Set `Date Sent` + `Status = SENT` only after `send_message` returns a messageId.
- Status vocabulary: `SENT` · `BOUNCED` · `RETRIED` · `NO-REPLY` · `FOLLOWED-UP` · `REPLIED` · `PORTAL`.

## 5b. Failed-response & bounce checks (run EVERY session + after the user sends)
This is what turns one-shot emails into a real pipeline. Do all four each run:
1. **Refresh the tracker** (read → append/update in place; never recreate).
2. **Verify what was sent** — `list_messages` (`in:sent`) to confirm each recipient/subject actually
   went out; set `Status = SENT` only on a real match.
3. **Catch bounces (delivery failed) → retry ladder.** `list_messages` query
   `from:mailer-daemon newer_than:1d` on the SENDING account (Gmail `newer_than` supports only
   d/m/y — use `1d`, not hours). For each bounce:
   - Mark the row `BOUNCED`.
   - If the address was 🔶 OSINT-inferred, **retry the next permutation** in the ladder
     (`first.last → flast → firstl → first_last → first → lastf`), up to `outreach.max_email_guesses`
     total attempts. Re-send, log `RETRIED` + which address, and keep a short history in a Notes cell
     (e.g. "v1 j.smith@ bounced 7/8 → retried jsmith@").
   - If all guesses are exhausted, **escalate to HR / general recruiting inbox** (§3 step 3 📥), or
     mark `PORTAL` and give the user the application URL.
4. **No-reply follow-ups (delivered but silent).** For every row with `Status = SENT` whose
   `Date Sent` is older than `outreach.followup_after_days` (default 7) AND with no reply in the
   inbox (`list_messages` query `from:<recipient> newer_than:14d`, and check the thread), **draft a
   short, friendly one-line follow-up** ("just floating this back up — still exploring [role] at
   [facility] for [year]; happy to share more"). Present it to the user; on their OK, send and flip
   the row to `FOLLOWED-UP`. If they've replied, mark `REPLIED` and stop chasing. Respect the recency
   rule — never send a follow-up if the last contact was within `outreach.followup_after_days`.

## 6. Hard rules
- Never invent a recipient and present it as verified. Inferring from a known org format is fine
  but must be **labeled inferred.**
- If `visa.required`, verify sponsorship on the actual posting — no label-trusting.
- If `criteria.welcome_check`, never apply to a 🔴 location without flagging it to the user first.
- **No duplicate contacts** — check the recipient against the tracker before sending; staffing
  firms reuse one recruiter/inbox across many facilities.
- Report comp honestly (confidence per row).

## 7. FINAL CHECKPOINT before sending (MANDATORY — never skip)
The whole reason the user delegates this is so their own assumption mistakes are NOT repeated —
so **assume nothing, verify everything.** Before sending or queueing ANY email:
1. **Read the FULL source, never a snippet/preview/summary.** Open the complete thread/message
   being replied to (`read_message`, not the list snippet). (This rule exists because a truncated
   preview once got misread — "3 recruiters" read as "3 openings" — and a false claim went out
   under the user's name. The recruiter caught it.)
2. **Every fact in the draft must be literally present in the source** — comp, openings,
   location, role, names. If inferred or remembered, verify, ask, or omit — don't state it as fact.
3. **Recipient + context match** — right person, right address, correct spelling; content fits
   THIS specific role/thread.
4. **Recency/dedup cleared** — check last email to this address (`in:sent to:<email>`); if ≤5
   days or awaiting their reply, flag to the user first.
5. Tell the user exactly what you verified, and get explicit OK.
When in doubt, ASK — never send on an assumption.
