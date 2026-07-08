# Tailoring your search

Everything that makes the kit *yours* lives in one file: **`~/.jobhunt-kit/profile.yml`**. The
skills read it on every run, so you can change your search at any time by editing it — no reinstall.

## The fields that matter most

### `visa.required` — the big switch
- **`false`** (US grad / citizen / green card): every visa mention disappears — no subject tag, no
  visa line, no sponsorship filter.
- **`true`** (IMG on a training visa): turns on the whole visa track — a bold "here's my situation"
  line in each email, a subject-line tag so non-sponsors self-screen, and a hard filter that skips
  employers who don't sponsor. Set `visa.situation` and `visa.subject_tag` to your specifics.

### `criteria` — the screen every lead is scored against
| Field | What it does |
|---|---|
| `specialties` | What you trained in (e.g. `["Family Medicine"]`) |
| `target_roles` | Roles you'll accept — be specific ("EM open to FM-trained, no EM residency required") |
| `min_comp_usd` | Leads below this base get flagged/skipped |
| `outpatient_ok_above_usd` | Outpatient only counts if it clears this |
| `new_grad_friendly` | Flags postings demanding years of prior attending experience |
| `no_locums` | Skip locum/temp roles |
| `geography` | `["any"]` or a state list like `["TN","TX","GA"]` |
| `climate`, `lifestyle` | Free-text; scored loosely and woven into emails |
| `no_income_tax_states_preferred` | Notes take-home in TN/TX/FL/etc. |
| `welcome_check` | Research whether a place is genuinely welcoming before applying (see below) |

### `welcome_check` — the community check
When `true`, before drafting for a location the assistant checks whether it's a place you'd
actually be welcome and safe: whether international/IMG physicians are already on staff **and
staying**, hate-group presence, welcoming-community signals. It scores 🟢/🟡/🔴 and won't apply to
a 🔴 without flagging it to you first. Especially worth keeping on if you're an IMG or a physician
of color. Set `false` to skip it.

## Examples

**US-trained hospitalist, no visa, Southeast, no-tax states:**
```yaml
visa: { required: false }
criteria:
  specialties: ["Internal Medicine"]
  target_roles: ["hospitalist / nocturnist"]
  min_comp_usd: 320000
  geography: ["TN", "TX", "FL"]
  welcome_check: false
```

**IMG FM grad wanting hospitalist OR FM-friendly ED, anywhere that sponsors:**
```yaml
visa:
  required: true
  situation: "J-1 visa — need a J-1 waiver + H-1B sponsorship"
  subject_tag: "(J-1 visa)"
criteria:
  specialties: ["Family Medicine"]
  target_roles: ["hospitalist", "emergency medicine open to FM-trained (no EM residency)"]
  min_comp_usd: 300000
  geography: ["any"]
  welcome_check: true
```

## Outreach automation (`outreach`)
The kit doesn't just send once and forget — it runs the pipeline for you:
| Field | What it does |
|---|---|
| `followup_after_days` | If a recruiter hasn't replied in this many days, the next run drafts a friendly follow-up for your approval (default 7). |
| `max_email_guesses` | When a recruiter's email isn't published, the kit infers it from the org's email format and tries the most likely address; if it bounces it walks a permutation ladder up to this many tries. |
| `escalate_to_hr` | When there's no named recruiter or the guesses are exhausted, fall back to the HR / `recruiting@` / careers inbox instead of giving up. |

The tracker Google Sheet is **created automatically** on your first run (you don't make it) and every
send, bounce, retry, and follow-up is logged there with a status (`SENT`/`BOUNCED`/`RETRIED`/
`NO-REPLY`/`FOLLOWED-UP`/`REPLIED`/`PORTAL`).

## Tip
Your intro line (`training.summary`) is woven into every email, so make it sound like *you* and
lead with your strengths. And once you've sent a few, ask the assistant to *"tune my texting voice
from my real sent messages"* so replies match how you actually write.
