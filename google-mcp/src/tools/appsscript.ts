import { google } from "googleapis";
import { getClient } from "../google-client.js";

// NOTE: besides the OAuth scope, each account must also turn ON the Apps Script API
// at https://script.google.com/home/usersettings — otherwise these calls 403.

type ScriptFile = { name: string; type: "SERVER_JS" | "HTML" | "JSON"; source: string };

// Create a standalone Apps Script project (or container-bound if parent_id is a Doc/Sheet/Slide ID).
export async function createScript(params: {
  account_alias: string;
  title: string;
  parent_id?: string;
}) {
  const auth = getClient(params.account_alias);
  const script = google.script({ version: "v1", auth });
  const res = await script.projects.create({
    requestBody: { title: params.title, parentId: params.parent_id },
  });
  return { scriptId: res.data.scriptId, title: res.data.title };
}

// Read a project's source files (each: name, type, source).
export async function getScript(params: {
  account_alias: string;
  script_id: string;
}) {
  const auth = getClient(params.account_alias);
  const script = google.script({ version: "v1", auth });
  const res = await script.projects.getContent({ scriptId: params.script_id });
  return { scriptId: res.data.scriptId, files: res.data.files ?? [] };
}

// Overwrite a project's source files. A manifest file named "appsscript" (type JSON) is required.
export async function updateScript(params: {
  account_alias: string;
  script_id: string;
  files: ScriptFile[];
}) {
  const auth = getClient(params.account_alias);
  const script = google.script({ version: "v1", auth });
  const res = await script.projects.updateContent({
    scriptId: params.script_id,
    requestBody: { files: params.files },
  });
  return { scriptId: res.data.scriptId, fileCount: (res.data.files ?? []).length };
}
