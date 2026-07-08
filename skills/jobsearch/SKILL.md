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
3. **Find the recipient email** — never fabricate a "verified" contact. Hierarchy:
   - ✅ **Verified:** the recruiter's email printed on the official posting / in the user's own
     sent mail. Confirm with WebFetch on the source page (search summaries sometimes *guess* — verify).
   - 🔶 **Inferred:** if only a name is known, find the org's dominant email format (search
     "<domain> email format") and construct it. Label confidence high/medium.
   - 📥 **General inbox:** a verified general recruiting inbox (info@…) when no individual is public.
   - 🌐 **Portal only:** if the employer publishes no email, address the draft to the user as a
     template and note the application URL.
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

## 5. Tracker
- Live master = the Google Sheet at `tracker.sheet_id` (created during setup). If it's blank,
  create one with google-mcp and write the id back into the profile.
- Columns (A–J): `#, Employer, Location, State, Role, Recipient, Confidence, Status, Date Sent,
  Welcome`. Column J = Welcome (🟢/🟡/🔴 + reason) from step 2 — fill on every new row.
- **Edit in place — don't regenerate.** `append_rows` for new sends, `update_cells` to flip a
  row's Status/Date Sent. Read current state with `read_sheet`.
- Set `Date Sent` + `Status = SENT` only after `send_message` returns a messageId.

## 5b. Ongoing maintenance (every run + after the user sends)
1. **Refresh the tracker** (read → append/update in place; never recreate).
2. **Verify what was sent** — `list_messages` (`in:sent`) to confirm each recipient/subject; set
   `Status = Sent` only on a real match.
3. **Catch bounces** — `list_messages` query `from:mailer-daemon newer_than:1d` on the SENDING
   account. (Gmail `newer_than` supports only d/m/y — use `1d`, not hours.) For each bounce: mark
   the row `Bounced`, retry the next-most-likely address (first.last ↔ flast ↔ firstinitiallast ↔
   first_last) or fall back to general inbox / portal, re-send, and log it.

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
