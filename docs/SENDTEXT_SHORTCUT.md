# Build the "SendText" Shortcut (macOS — optional, for the texting skill)

The `sendtext` skill sends iMessage/SMS on your behalf through a macOS **Shortcut** named
**`SendText`**. Shortcuts can't be reliably shipped as a file across machines (they're signed
per-Mac), so you build this once — it's four actions and takes ~2 minutes.

> **Doing this with Claude Code?** Say *"help me build the SendText shortcut"* and it'll walk you
> through it action by action, then test it.

## What it does
It receives one piece of text shaped like `+15551234567|your message`, splits it on the `|`, and
sends the message silently (no compose window).

## Build it
1. Open the **Shortcuts** app → **+** (new shortcut) → name it exactly **`SendText`**.
2. Add these actions in order (search each by name in the right-hand action list):

   | # | Action | Configure |
   |---|--------|-----------|
   | 1 | **Split Text** | Text = **Shortcut Input**; Separator = **Custom** → type `\|` (a single pipe) |
   | 2 | **Get Item from List** | Get **Item at Index** **1** of **Split Text** → this is the recipient |
   | 3 | **Get Item from List** | Get **Item at Index** **2** of **Split Text** → this is the message |
   | 4 | **Send Message** | Message = the item from action 3; Recipients = the item from action 2 |

3. Open the Send Message action's options and turn **OFF** "Show When Run" (a.k.a. the compose
   sheet) so it sends silently.
4. In the shortcut's settings (ⓘ), make sure **"Receives … input"** is set (Text) so a piped
   string reaches action 1.

## Test it
In Terminal:
```bash
echo "+1YOURNUMBER|test from the jobhunt kit" | shortcuts run "SendText"
```
Replace `+1YOURNUMBER` with your own cell. Exit code `0` and a text arriving = success.

## Reading your texts (for "catch me up on my texts")
The skill also *reads* your Messages to triage replies. That needs your terminal app (or VS Code,
wherever you run Claude) to have **Full Disk Access**:
- **System Settings → Privacy & Security → Full Disk Access →** add your terminal → toggle on → restart it.

## Turn it on
Set in `~/.jobhunt-kit/profile.yml`:
```yaml
texting:
  enabled: true
  your_number: "+15551234567"
```

## Notes
- Recipients must be **E.164** (`+1XXXXXXXXXX`).
- The message body can't contain a literal `|` (that's the delimiter) — reword if needed.
- iMessage (blue) always works; green-bubble SMS only if your iPhone has Text Message Forwarding on.
