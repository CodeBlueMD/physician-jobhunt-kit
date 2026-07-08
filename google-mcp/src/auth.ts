import { createServer } from "http";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import { getCredentials } from "./google-client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/presentations",
  "https://www.googleapis.com/auth/script.projects",
];

const args = process.argv.slice(2);
const aliasIdx = args.indexOf("--alias");
if (aliasIdx === -1 || !args[aliasIdx + 1]) {
  console.error("Usage: npx tsx src/auth.ts --alias <name>");
  process.exit(1);
}
const alias = args[aliasIdx + 1];

const { clientId, clientSecret, redirectUri } = getCredentials();
const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const loginHintIdx = args.indexOf("--email");
const loginHint = loginHintIdx !== -1 ? args[loginHintIdx + 1] : undefined;

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent",
  ...(loginHint ? { login_hint: loginHint } : {}),
});

console.log(`\nOpen this URL in your browser:\n\n${authUrl}\n`);

const server = createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost:3000`);
  const code = url.searchParams.get("code");

  if (!code) {
    res.writeHead(400);
    res.end("No code in redirect.");
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    mkdirSync(join(ROOT, ".tokens"), { recursive: true });
    const tokenPath = join(ROOT, ".tokens", `${alias}.json`);
    writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h2>Auth complete. You can close this tab.</h2>");
    console.log(`\nTokens saved to .tokens/${alias}.json`);
    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500);
    res.end("Token exchange failed.");
    console.error(err);
    server.close();
    process.exit(1);
  }
});

server.listen(3000, () => {
  console.log("Waiting for redirect on http://localhost:3000 ...");
});
