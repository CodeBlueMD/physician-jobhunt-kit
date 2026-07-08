import { google } from "googleapis";
import { getClient } from "../google-client.js";

// Pull plain text out of a slide's shape page-elements.
function slideText(slide: any): string[] {
  const lines: string[] = [];
  for (const el of slide.pageElements ?? []) {
    const runs = el.shape?.text?.textElements ?? [];
    const text = runs.map((r: any) => r.textRun?.content ?? "").join("").trim();
    if (text) lines.push(text);
  }
  return lines;
}

// Create a new Google Slides presentation.
export async function createPresentation(params: {
  account_alias: string;
  title: string;
}) {
  const auth = getClient(params.account_alias);
  const slides = google.slides({ version: "v1", auth });
  const res = await slides.presentations.create({ requestBody: { title: params.title } });
  const presentationId = res.data.presentationId!;
  return {
    presentationId,
    title: res.data.title,
    link: `https://docs.google.com/presentation/d/${presentationId}/edit`,
  };
}

// Read a presentation: per-slide object IDs + extracted text.
export async function readPresentation(params: {
  account_alias: string;
  presentation_id: string;
}) {
  const auth = getClient(params.account_alias);
  const slides = google.slides({ version: "v1", auth });
  const res = await slides.presentations.get({ presentationId: params.presentation_id });
  const out = (res.data.slides ?? []).map((s: any, i: number) => ({
    index: i,
    objectId: s.objectId,
    text: slideText(s),
  }));
  return { title: res.data.title, slideCount: out.length, slides: out };
}

// Add a slide using the TITLE_AND_BODY layout, optionally filling title/body text.
export async function addSlide(params: {
  account_alias: string;
  presentation_id: string;
  title?: string;
  body?: string;
}) {
  const auth = getClient(params.account_alias);
  const slides = google.slides({ version: "v1", auth });
  const stamp = Date.now();
  const titleId = `title_${stamp}`;
  const bodyId = `body_${stamp}`;

  const requests: any[] = [{
    createSlide: {
      slideLayoutReference: { predefinedLayout: "TITLE_AND_BODY" },
      placeholderIdMappings: [
        { layoutPlaceholder: { type: "TITLE", index: 0 }, objectId: titleId },
        { layoutPlaceholder: { type: "BODY", index: 0 }, objectId: bodyId },
      ],
    },
  }];
  if (params.title) requests.push({ insertText: { objectId: titleId, text: params.title } });
  if (params.body) requests.push({ insertText: { objectId: bodyId, text: params.body } });

  const res = await slides.presentations.batchUpdate({
    presentationId: params.presentation_id,
    requestBody: { requests },
  });
  const slideId = res.data.replies?.[0]?.createSlide?.objectId;
  return { ok: true, slideObjectId: slideId };
}
