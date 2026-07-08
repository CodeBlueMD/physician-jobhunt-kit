import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

export function getCredentials() {
  const raw = readFileSync(join(ROOT, "credentials.json"), "utf-8");
  const parsed = JSON.parse(raw);
  const creds = parsed.installed ?? parsed.web;
  return {
    clientId: creds.client_id as string,
    clientSecret: creds.client_secret as string,
    redirectUri: "http://localhost:3000",
  };
}

export function getClient(alias: string): OAuth2Client {
  const tokenPath = join(ROOT, ".tokens", `${alias}.json`);
  const tokens = JSON.parse(readFileSync(tokenPath, "utf-8"));
  const { clientId, clientSecret, redirectUri } = getCredentials();
  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  client.setCredentials(tokens);
  client.on("tokens", (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    writeFileSync(tokenPath, JSON.stringify(merged, null, 2));
  });
  return client;
}
