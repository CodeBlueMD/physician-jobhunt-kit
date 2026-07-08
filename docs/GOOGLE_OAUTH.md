# Google OAuth setup — step by step (~5 minutes, one time)

The kit sends email and updates your tracker from **your own** Google account, through a small
server that runs **only on your Mac** (`google-mcp`). Your data never touches anyone else's cloud.

To let that server act on your account, Google requires **you** to create a personal OAuth
"client" and authorize it. This is the one part nobody can automate for you — but it's just
clicking through Google Cloud Console once. Follow along.

> **Doing this with Claude Code?** Just say *"walk me through the Google OAuth setup."* It will
> open each page and check your `credentials.json` when you're done. The steps below are the same.

---

## What you'll end up with
A file called **`credentials.json`** sitting in the `google-mcp/` folder. That's it. It's
gitignored, so it never gets committed or shared.

---

## Step 1 — Create a project
1. Go to **https://console.cloud.google.com/**
2. Top-left project dropdown → **New Project**
3. Name it anything (e.g. `jobhunt-kit`) → **Create** → wait a few seconds → select it.

## Step 2 — Enable the APIs
Go to **APIs & Services → Library** and enable each of these (search, click, **Enable**):
- **Gmail API**
- **Google Calendar API**
- **Google Drive API**
- **Google Sheets API**

## Step 3 — Configure the consent screen
1. **APIs & Services → OAuth consent screen**
2. User Type: **External** → **Create**
3. Fill in **App name** (e.g. `jobhunt-kit`) and your email for the support/developer fields → **Save and Continue**
4. **Scopes** → Save and Continue (you don't have to add any here; you'll grant them in the browser later)
5. **Test users → Add Users →** add **every Gmail address you'll use with the kit** (the account
   you send from). → **Save and Continue**
   > This is the #1 gotcha: if your email isn't a Test User, authorization later fails with
   > "Access blocked." Add it now.
6. Back to Dashboard.

## Step 4 — Create the OAuth client
1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type: **Desktop app**  ← important (not "Web")
3. Name: `google-mcp` → **Create**
4. In the popup, click **Download JSON**.

## Step 5 — Put it in place
1. Rename the downloaded file to exactly **`credentials.json`**
2. Move it into the **`google-mcp/`** folder of this repo (next to `package.json`).

Done. Verify it:
```bash
bash setup/02_validate_credentials.sh
```
You should see `✓ credentials.json looks valid`.

---

## Step 6 — Authenticate your account(s)
Now grant your OAuth client access to each Gmail account:
```bash
bash setup/03_authenticate.sh
```
For each account you'll pick a short **alias** (e.g. `personal`) — a browser opens, you sign in,
and you'll see **"Google hasn't verified this app."** That's expected — *you* made the app.
Click **Continue / Advanced → Go to jobhunt-kit (unsafe)** → **Allow**. The terminal prints
`Tokens saved to .tokens/<alias>.json`.

> Use that same alias as `identity.send_alias` in your profile so the kit sends from the right account.

---

## Troubleshooting
| Symptom | Fix |
|---|---|
| **"Access blocked: … has not completed the verification process"** | Your email isn't a Test User. Step 3.5 — add it, retry. |
| **"redirect_uri_mismatch"** | You created a *Web* client. Delete it, redo Step 4 as **Desktop app**. |
| **"Cannot find .tokens/<alias>.json"** | The browser flow didn't finish. Re-run `setup/03_authenticate.sh`. |
| **Validator says "looks like the example file"** | You still have `credentials.example.json`, not your real download. Rename your download to `credentials.json`. |
| **Token stops working after a while** | Test-mode refresh tokens can expire after ~7 days. Just re-run `setup/03_authenticate.sh` for that alias. (Publishing your consent screen to "In production" avoids this.) |

## Is this safe?
Yes. The OAuth client and tokens live only on your Mac and are gitignored. The kit only ever acts
on accounts you explicitly authorize, and only sends anything after you approve it. You can revoke
access any time at **https://myaccount.google.com/permissions**.
