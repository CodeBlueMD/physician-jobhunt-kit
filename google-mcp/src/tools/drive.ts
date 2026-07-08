import { google } from "googleapis";
import { getClient } from "../google-client.js";

const GOOGLE_DOC_TYPES: Record<string, string> = {
  "application/vnd.google-apps.document": "text/plain",
  "application/vnd.google-apps.spreadsheet": "text/csv",
  "application/vnd.google-apps.presentation": "text/plain",
};

export async function listFiles(params: {
  account_alias: string;
  max_results?: number;
  query?: string;
}) {
  const auth = getClient(params.account_alias);
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.list({
    pageSize: params.max_results ?? 10,
    q: params.query,
    fields: "files(id,name,mimeType,size,modifiedTime,webViewLink)",
  });
  return res.data.files ?? [];
}

export async function readFile(params: {
  account_alias: string;
  file_id: string;
}) {
  const auth = getClient(params.account_alias);
  const drive = google.drive({ version: "v3", auth });

  const meta = await drive.files.get({
    fileId: params.file_id,
    fields: "id,name,mimeType",
  });
  const mimeType = meta.data.mimeType ?? "";

  if (GOOGLE_DOC_TYPES[mimeType]) {
    const res = await drive.files.export(
      { fileId: params.file_id, mimeType: GOOGLE_DOC_TYPES[mimeType] },
      { responseType: "text" }
    );
    return { name: meta.data.name, mimeType, content: res.data as string };
  }

  const res = await drive.files.get(
    { fileId: params.file_id, alt: "media" },
    { responseType: "text" }
  );
  return { name: meta.data.name, mimeType, content: res.data as string };
}

export async function uploadFile(params: {
  account_alias: string;
  name: string;
  content: string;
  mime_type?: string;
  google_mime_type?: string;
  folder_id?: string;
}) {
  const auth = getClient(params.account_alias);
  const drive = google.drive({ version: "v3", auth });
  const { Readable } = await import("stream");
  const stream = Readable.from([params.content]);

  const res = await drive.files.create({
    requestBody: {
      name: params.name,
      // Set a google-apps target type (e.g. application/vnd.google-apps.spreadsheet)
      // to convert the uploaded media into a native Doc/Sheet/Slides file.
      mimeType: params.google_mime_type,
      parents: params.folder_id ? [params.folder_id] : undefined,
    },
    media: {
      mimeType: params.mime_type ?? "text/plain",
      body: stream,
    },
    fields: "id,name,webViewLink",
  });
  return { id: res.data.id, name: res.data.name, webViewLink: res.data.webViewLink };
}
