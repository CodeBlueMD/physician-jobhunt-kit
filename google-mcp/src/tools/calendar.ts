import { google } from "googleapis";
import { getClient } from "../google-client.js";

export async function listEvents(params: {
  account_alias: string;
  calendar_id?: string;
  max_results?: number;
  time_min?: string;
}) {
  const auth = getClient(params.account_alias);
  const calendar = google.calendar({ version: "v3", auth });
  const res = await calendar.events.list({
    calendarId: params.calendar_id ?? "primary",
    maxResults: params.max_results ?? 10,
    timeMin: params.time_min ?? new Date().toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });
  return (res.data.items ?? []).map((e) => ({
    id: e.id,
    summary: e.summary,
    description: e.description,
    start: e.start?.dateTime ?? e.start?.date,
    end: e.end?.dateTime ?? e.end?.date,
    location: e.location,
    attendees: (e.attendees ?? []).map((a) => ({ email: a.email, name: a.displayName })),
    htmlLink: e.htmlLink,
  }));
}

export async function createEvent(params: {
  account_alias: string;
  summary: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  attendees?: string[];
  calendar_id?: string;
}) {
  const auth = getClient(params.account_alias);
  const calendar = google.calendar({ version: "v3", auth });
  const res = await calendar.events.insert({
    calendarId: params.calendar_id ?? "primary",
    requestBody: {
      summary: params.summary,
      description: params.description,
      location: params.location,
      start: { dateTime: params.start },
      end: { dateTime: params.end },
      attendees: (params.attendees ?? []).map((email) => ({ email })),
    },
  });
  return {
    id: res.data.id,
    summary: res.data.summary,
    htmlLink: res.data.htmlLink,
    start: res.data.start?.dateTime,
    end: res.data.end?.dateTime,
  };
}
