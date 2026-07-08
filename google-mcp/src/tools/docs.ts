import { google } from "googleapis";
import { getClient } from "../google-client.js";

// Extract plain text from a Docs document body (paragraphs + table cells).
function extractText(body: any): string {
  const out: string[] = [];
  const walk = (elements: any[]) => {
    for (const el of elements ?? []) {
      if (el.paragraph) {
        for (const pe of el.paragraph.elements ?? []) {
          if (pe.textRun?.content) out.push(pe.textRun.content);
        }
      } else if (el.table) {
        for (const row of el.table.tableRows ?? []) {
          for (const cell of row.tableCells ?? []) walk(cell.content);
        }
      }
    }
  };
  walk(body?.content);
  return out.join("");
}

// Create a Google Doc, optionally seeding it with body text.
export async function createDoc(params: {
  account_alias: string;
  title: string;
  text?: string;
}) {
  const auth = getClient(params.account_alias);
  const docs = google.docs({ version: "v1", auth });
  const created = await docs.documents.create({ requestBody: { title: params.title } });
  const documentId = created.data.documentId!;
  if (params.text) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests: [{ insertText: { location: { index: 1 }, text: params.text } }] },
    });
  }
  return {
    documentId,
    title: created.data.title,
    link: `https://docs.google.com/document/d/${documentId}/edit`,
  };
}

// Read a Doc's plain-text content.
export async function readDoc(params: {
  account_alias: string;
  document_id: string;
}) {
  const auth = getClient(params.account_alias);
  const docs = google.docs({ version: "v1", auth });
  const res = await docs.documents.get({ documentId: params.document_id });
  return { title: res.data.title, content: extractText(res.data.body) };
}

// Append text to the end of a Doc's body.
export async function appendDoc(params: {
  account_alias: string;
  document_id: string;
  text: string;
}) {
  const auth = getClient(params.account_alias);
  const docs = google.docs({ version: "v1", auth });
  await docs.documents.batchUpdate({
    documentId: params.document_id,
    requestBody: { requests: [{ insertText: { endOfSegmentLocation: {}, text: params.text } }] },
  });
  return { ok: true, document_id: params.document_id };
}

// Find-and-replace all occurrences of a string in a Doc.
export async function replaceText(params: {
  account_alias: string;
  document_id: string;
  find: string;
  replace: string;
  match_case?: boolean;
}) {
  const auth = getClient(params.account_alias);
  const docs = google.docs({ version: "v1", auth });
  const res = await docs.documents.batchUpdate({
    documentId: params.document_id,
    requestBody: {
      requests: [{
        replaceAllText: {
          containsText: { text: params.find, matchCase: params.match_case ?? false },
          replaceText: params.replace,
        },
      }],
    },
  });
  const occurrences = res.data.replies?.[0]?.replaceAllText?.occurrencesChanged ?? 0;
  return { occurrencesChanged: occurrences };
}
