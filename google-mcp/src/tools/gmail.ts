import { google } from "googleapis";
import { readFileSync } from "fs";
import { basename } from "path";
import { getClient } from "../google-client.js";

export async function listMessages(params: {
  account_alias: string;
  max_results?: number;
  query?: string;
}) {
  const auth = getClient(params.account_alias);
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults: params.max_results ?? 10,
    q: params.query,
  });
  const messages = res.data.messages ?? [];
  const details = await Promise.all(
    messages.map((m) =>
      gmail.users.messages.get({
        userId: "me",
        id: m.id!,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "Date"],
      })
    )
  );
  return details.map((d) => ({
    id: d.data.id,
    threadId: d.data.threadId,
    snippet: d.data.snippet,
    headers: Object.fromEntries(
      (d.data.payload?.headers ?? []).map((h) => [h.name, h.value])
    ),
  }));
}

export async function readMessage(params: {
  account_alias: string;
  message_id: string;
}) {
  const auth = getClient(params.account_alias);
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.get({
    userId: "me",
    id: params.message_id,
    format: "full",
  });

  const headers = Object.fromEntries(
    (res.data.payload?.headers ?? []).map((h) => [h.name, h.value])
  );

  const body = extractBody(res.data.payload);
  return { id: res.data.id, threadId: res.data.threadId, headers, body };
}

function extractBody(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain") {
        return Buffer.from(part.body?.data ?? "", "base64url").toString("utf-8");
      }
    }
    for (const part of payload.parts) {
      const result = extractBody(part);
      if (result) return result;
    }
  }
  return "";
}

export async function createDraft(params: {
  account_alias: string;
  to: string;
  subject: string;
  body: string;
}) {
  const auth = getClient(params.account_alias);
  const gmail = google.gmail({ version: "v1", auth });
  const encoded = buildMime({ to: params.to, subject: params.subject, body: params.body });
  const res = await gmail.users.drafts.create({
    userId: "me",
    requestBody: { message: { raw: encoded } },
  });
  return { draftId: res.data.id, messageId: res.data.message?.id };
}

export async function sendMessage(params: {
  account_alias: string;
  to: string;
  subject: string;
  body: string;
  html_body?: string;
  attachments?: { filename?: string; path?: string; content?: string; is_base64?: boolean; mime_type?: string }[];
}) {
  const auth = getClient(params.account_alias);
  const gmail = google.gmail({ version: "v1", auth });
  const encoded = buildMime({
    to: params.to,
    subject: params.subject,
    body: params.body,
    html_body: params.html_body,
    attachments: params.attachments,
  });
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded },
  });
  return { messageId: res.data.id, threadId: res.data.threadId };
}

function buildMime(params: {
  to: string;
  subject: string;
  body: string;
  html_body?: string;
  attachments?: { filename?: string; path?: string; content?: string; is_base64?: boolean; mime_type?: string }[];
}): string {
  const boundary = `boundary_${Date.now()}`;
  const altBoundary = `alt_${Date.now()}`;
  const hasAttachments = params.attachments && params.attachments.length > 0;
  const hasHtml = !!params.html_body;

  if (!hasAttachments && !hasHtml) {
    const raw = [
      `To: ${params.to}`,
      `Subject: ${encodeHeader(params.subject)}`,
      "Content-Type: text/plain; charset=utf-8",
      "MIME-Version: 1.0",
      "",
      params.body,
    ].join("\r\n");
    return Buffer.from(raw).toString("base64url");
  }

  if (!hasAttachments && hasHtml) {
    const raw = [
      `To: ${params.to}`,
      `Subject: ${encodeHeader(params.subject)}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      "",
      `--${altBoundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      params.body,
      `--${altBoundary}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      params.html_body!,
      `--${altBoundary}--`,
    ].join("\r\n");
    return Buffer.from(raw).toString("base64url");
  }

  // Has attachments — use multipart/mixed, with nested multipart/alternative if HTML present
  const parts: string[] = [
    `To: ${params.to}`,
    `Subject: ${encodeHeader(params.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
  ];

  if (hasHtml) {
    parts.push(
      `--${boundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      "",
      `--${altBoundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      params.body,
      `--${altBoundary}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      params.html_body!,
      `--${altBoundary}--`,
    );
  } else {
    parts.push(
      `--${boundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      params.body,
    );
  }

  for (const att of params.attachments!) {
    let b64: string;
    let filename = att.filename;
    let mimeType = att.mime_type;
    if (att.path) {
      // Preferred path: read raw bytes off disk (correct for PDFs/binaries).
      b64 = readFileSync(att.path).toString("base64");
      filename = filename ?? basename(att.path);
      mimeType = mimeType ?? guessMime(att.path);
    } else if (att.is_base64) {
      // Caller already supplied base64-encoded bytes.
      b64 = (att.content ?? "").replace(/\s+/g, "");
    } else {
      // Plain-text content.
      b64 = Buffer.from(att.content ?? "").toString("base64");
    }
    parts.push(
      `--${boundary}`,
      `Content-Type: ${mimeType ?? "application/octet-stream"}; name="${filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${filename}"`,
      "",
      b64
    );
  }

  parts.push(`--${boundary}--`);
  return Buffer.from(parts.join("\r\n")).toString("base64url");
}

function guessMime(p: string): string {
  const ext = p.toLowerCase().split(".").pop() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    txt: "text/plain",
    csv: "text/csv",
  };
  return map[ext] ?? "application/octet-stream";
}

function encodeHeader(value: string): string {
  // RFC 2047 encoded-word so non-ASCII subjects (emoji, em-dash, ·) render correctly.
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
}
