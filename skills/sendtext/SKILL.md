---
name: sendtext
description: >-
  Draft and send iMessage/SMS on the owner's behalf via the macOS SendText Shortcut, matching
  their real texting voice per relationship (professional / friends & family / partner). Use when
  they say "text <person> ...", "reply to <recruiter>", "tell <name> ...", "catch me up on my
  texts", or want to triage recruiter texts. macOS only (needs the local Messages DB + the Shortcut).
---

# sendtext — send texts as the owner, in their own voice

Reads the owner's texts to triage who needs a reply, and drafts + sends replies in the right
register for the relationship. **All personal details come from `~/.jobhunt-kit/profile.yml`.**

## 0. Load the profile FIRST
Read **`~/.jobhunt-kit/profile.yml`**. The owner's own number is `texting.your_number`; known
contacts are `texting.contacts`. If `texting.enabled` is false, tell the user texting is disabled
in their profile and stop.

## How sending works (the mechanism)
Sending goes through a macOS Shortcut named **`SendText`** (you build it once — see
`docs/SENDTEXT_SHORTCUT.md`). It takes ONE piped string `"<recipient>|<body>"`, splits on `|`,
and sends **silently** (compose sheet off).

```bash
echo "+1NUMBER|message text here" | shortcuts run "SendText"
```
# exit 0 = sent

- Recipient must be **E.164** (`+1XXXXXXXXXX` for US/Canada).
- The **body must not contain a literal `|`** — that's the delimiter. Rephrase if needed.
- iMessage (blue) always works; SMS (green) only if iPhone Text Message Forwarding is on.
- If unsure it sent, read the thread back from chat.db.

## Reading incoming texts (context before replying / "catch me up")
Messages live in `~/Library/Messages/chat.db` (SQLite; needs the terminal app to have **Full Disk
Access** in System Settings → Privacy). Gotchas:
- Most message bodies are in `attributedBody` (a blob), NOT the `text` column. Decode: find
  `b'NSString'`, then the `+` marker, then a length byte (`0x81`→next 2 LE, `0x82`→next 4 LE, else
  1 byte), then UTF-8.
- Dates are Apple-epoch ns: `datetime(date/1000000000 + 978307200,'unixepoch','localtime')`. When
  filtering, `CAST(strftime('%s','now','-25 days') AS INTEGER)` (numeric > text is always false in
  SQLite — must cast).
- Contact names: `~/Library/Application Support/AddressBook/Sources/*/AddressBook-v22.abcddb` → join
  `ZABCDPHONENUMBER.ZOWNER` to `ZABCDRECORD.Z_PK` for names. Match on last-10 digits.
- `is_from_me`: 1 = owner sent, 0 = received.

## HARD RULES
1. **Always draft → show the owner → get explicit OK → then run SendText.** Never fire a text
   without their go-ahead in that same exchange.
2. **Check last contact FIRST (see Pre-send check).** Before sending ANY message, verify when the
   owner last emailed AND last texted that person. If within ~5 days, or still awaiting their
   reply, STOP and tell them — don't re-send without explicit OK. (Prevents an email + text landing
   on the same recruiter an hour apart.)
3. **Confirm the recipient number/address** before sending — verify against Contacts/history.
4. **Match the voice profile to the relationship** (below). A formal text to a buddy, or slang to a
   recruiter, is a failure.
5. **Don't invent facts** (availability, dates, comp, visa specifics) — if unknown, ask.
6. Skip the owner's **personal** threads when triaging recruiters unless asked.

## Pre-send check (run before EVERY send — both channels)
For the recipient, look up the most recent OUTBOUND on each channel and report it:
- **Email:** `list_messages` (`account_alias: identity.send_alias`, query `in:sent to:<email>`) →
  newest date + gist.
- **Text:** query `chat.db` for the last `is_from_me=1` message to that number → date + gist.
Decision: last contact **>1 week ago or never** → proceed on their OK. **≤5 days or awaiting their
reply** → say *"you last reached [name] via [channel] on [date] — send again anyway?"* and WAIT.

## FINAL CHECKPOINT before sending (MANDATORY — never skip)
Assume nothing, verify everything. Before any send:
1. **Read the FULL source, never a snippet/summary/preview** — open the complete message/thread.
2. **Every fact in the draft must be literally present in the source** — if inferred, don't state
   it as fact; ask or leave it out.
3. **Recipient + context match** — right person, right number, correct spelling, fits THIS thread.
4. **Recency/dedup** (above) cleared.
5. Tell the owner exactly what you verified, and get explicit OK.

## Recipient categories
Classify each recipient, then pick the matching voice:
- **PARTNER** — the owner's partner (number in `texting.contacts` if provided). Warm, brief register.
- **PROFESSIONAL / RECRUITERS** — job + business/service contacts, and any unknown number texting
  about jobs. Polite-professional register.
- **FRIENDS & FAMILY** — saved personal contacts. Casual register.
To classify a **new** number: a saved personal name in Contacts → friends & family; job content or
unknown business → professional; default to professional/cautious if genuinely unsure.

## VOICE PROFILES
> These are sensible defaults. On first use, ask the owner for 3–5 of their real sent texts per
> category and tune these to match their actual voice — the whole point is that a reply sounds
> like *them*, not like an assistant.

### Professional / recruiters
- Open with **"Hey [First name]"** (or "Hi [First name]"). Use their first name.
- Friendly but courteous; full words; reads professional. Lead with the ask, be concise.
- Surface any visa need early **if `visa.required`** (it's a dealbreaker filter).
- Close with "Thanks" / "Sounds good!". **No emoji.**

### Friends & family
- Very casual, lowercase, minimal punctuation; leave small typos — don't over-polish.
- Slang + light banter; emoji sparingly. Short, punchy, reactive.

### Partner
- Warm, brief, practical. Lowercase, minimal punctuation. No slang.
- Logistics + sharing links/places + caring check-ins. Keep it natural, not over-mushy.

## Workflow
1. **Triage ("catch me up on my texts"):** read chat.db (last ~25d), split recruiter vs personal,
   summarize who's waiting on a reply (ball-in-their-court vs theirs), and cross-reference the job
   tracker (`tracker.sheet_id`) for recruiters. Offer to add new text-recruiters to the tracker.
2. **Send:** pick the voice profile → draft → show the owner → on approval run `SendText` → confirm
   sent (exit 0; optionally read back).
3. Keep the recruiter tracker in sync after sends.

Pairs with the `jobsearch` + `doccafe-triage` skills for the recruiter pipeline.
