# google-mcp — local Google (Gmail / Calendar / Drive / Sheets) MCP server

A small, local, no-cloud-middleware MCP server that lets Claude read + send Gmail,
manage Calendar, and read/write Drive & Sheets for **one or more** of your own Google
accounts. Everything runs on your machine; your tokens never leave it.

> Most people don't need to read this file directly — the kit's `install.sh` (or asking
> Claude Code to run the setup, see the repo `README.md`) walks you through all of it.
> Full picture-by-picture OAuth walkthrough: **`../docs/GOOGLE_OAUTH.md`**.

## Prerequisites
- Node.js 20+ (`node -v`) and `npx`

## 1. Get a Google OAuth client (~5 min, one time)
See `../docs/GOOGLE_OAUTH.md`. In short: create a Google Cloud project → enable the Gmail,
Calendar, Drive, and Sheets APIs → configure the OAuth consent screen (External, add
yourself as a Test User) → create an **OAuth client ID → Desktop app** → download the JSON →
rename it to `credentials.json` and place it in **this** folder (next to `package.json`).
`credentials.json` is gitignored — it will never be committed.

## 2. Install dependencies
```bash
cd google-mcp
npm install
```

## 3. Authenticate each account (run once per account)
Pick any short alias you like (e.g. `personal`, `work`):
```bash
npm run auth -- --alias personal
```
A browser opens → sign in → **Continue** past the "app isn't verified" screen (that's your
own app) → grant access. The terminal prints `Tokens saved to .tokens/personal.json`.
Repeat for any other account with a different alias.

## 4. Register with Claude
The kit's `setup/06_register.sh` does this for you (adds the server to `~/.claude.json`).
To do it manually, add to your Claude MCP config:
```json
{
  "mcpServers": {
    "google-mcp": {
      "command": "npx",
      "args": ["tsx", "<ABSOLUTE_PATH_TO>/google-mcp/src/index.ts"]
    }
  }
}
```
Restart Claude, then try: *"List my last 5 emails for account personal."*

## Tools
`list_messages`, `read_message`, `create_draft`, `send_message` (supports file attachments),
`list_events`, `create_event`, `list_files`, `read_file`, `upload_file`,
`create_sheet`, `read_sheet`, `append_rows`, `update_cells`, `clear_range`, `delete_rows`. Every
tool takes an `account_alias` matching a file in `.tokens/`.

## Troubleshooting
- **"Access blocked" in the browser** → your email isn't added as a Test User on the OAuth
  consent screen. Add it and retry.
- **"Cannot find .tokens/<alias>.json"** → run `npm run auth -- --alias <alias>` first.
- **Tools don't show up in Claude** → check the absolute path in the MCP config and restart Claude.
