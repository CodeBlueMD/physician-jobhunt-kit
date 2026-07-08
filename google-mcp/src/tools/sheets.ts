import { google } from "googleapis";
import { getClient } from "../google-client.js";

// Create a brand-new spreadsheet, optionally with a header row (bolded + frozen).
// Returns the spreadsheet_id + URL — use the id for all later read/append/update calls.
export async function createSheet(params: {
  account_alias: string;
  title: string;
  header?: string[];
  tab_title?: string;
}) {
  const sheets = google.sheets({ version: "v4", auth: getClient(params.account_alias) });
  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: params.title },
      sheets: params.tab_title ? [{ properties: { title: params.tab_title } }] : undefined,
    },
    fields: "spreadsheetId,spreadsheetUrl,sheets(properties(sheetId,title))",
  });
  const spreadsheetId = created.data.spreadsheetId!;
  const firstSheet = created.data.sheets?.[0]?.properties;
  const sheetId = firstSheet?.sheetId ?? 0;
  const tab = firstSheet?.title ?? "Sheet1";

  if (params.header && params.header.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [params.header] },
    });
    // Bold + freeze the header row so the tracker looks like a real tracker.
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: { userEnteredFormat: { textFormat: { bold: true } } },
              fields: "userEnteredFormat.textFormat.bold",
            },
          },
          {
            updateSheetProperties: {
              properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
              fields: "gridProperties.frozenRowCount",
            },
          },
        ],
      },
    });
  }
  return { spreadsheet_id: spreadsheetId, url: created.data.spreadsheetUrl, tab_title: tab };
}

// Read a cell range. (Drive read_file exports the whole sheet as CSV; this is cell-precise.)
export async function readSheet(params: {
  account_alias: string;
  spreadsheet_id: string;
  range?: string;
}) {
  const sheets = google.sheets({ version: "v4", auth: getClient(params.account_alias) });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: params.spreadsheet_id,
    range: params.range ?? "A1:Z1000",
  });
  return res.data.values ?? [];
}

// Write a 2-D array of values to a range (overwrites those cells).
export async function updateCells(params: {
  account_alias: string;
  spreadsheet_id: string;
  range: string;
  values: (string | number)[][];
}) {
  const sheets = google.sheets({ version: "v4", auth: getClient(params.account_alias) });
  const res = await sheets.spreadsheets.values.update({
    spreadsheetId: params.spreadsheet_id,
    range: params.range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: params.values },
  });
  return { updatedRange: res.data.updatedRange, updatedCells: res.data.updatedCells };
}

// Append rows to the end of a sheet.
export async function appendRows(params: {
  account_alias: string;
  spreadsheet_id: string;
  range?: string;
  values: (string | number)[][];
}) {
  const sheets = google.sheets({ version: "v4", auth: getClient(params.account_alias) });
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: params.spreadsheet_id,
    range: params.range ?? "A1",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: params.values },
  });
  return { updates: res.data.updates };
}

// Clear the values in a range (keeps the rows; just empties cells).
export async function clearRange(params: {
  account_alias: string;
  spreadsheet_id: string;
  range: string;
}) {
  const sheets = google.sheets({ version: "v4", auth: getClient(params.account_alias) });
  const res = await sheets.spreadsheets.values.clear({
    spreadsheetId: params.spreadsheet_id,
    range: params.range,
  });
  return { clearedRange: res.data.clearedRange };
}

async function resolveSheetId(sheets: any, spreadsheetId: string, sheetTitle?: string): Promise<number> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets(properties(sheetId,title))" });
  const list = meta.data.sheets ?? [];
  if (sheetTitle) {
    const found = list.find((s: any) => s.properties.title === sheetTitle);
    if (!found) throw new Error(`Sheet/tab '${sheetTitle}' not found`);
    return found.properties.sheetId;
  }
  return list[0]?.properties?.sheetId ?? 0;
}

// Delete entire rows (1-based, inclusive: start_row=2,end_row=10 removes rows 2–10; row 1 = header).
export async function deleteRows(params: {
  account_alias: string;
  spreadsheet_id: string;
  sheet_title?: string;
  start_row: number;
  end_row: number;
}) {
  const sheets = google.sheets({ version: "v4", auth: getClient(params.account_alias) });
  const sheetId = await resolveSheetId(sheets, params.spreadsheet_id, params.sheet_title);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: params.spreadsheet_id,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: "ROWS", startIndex: params.start_row - 1, endIndex: params.end_row },
        },
      }],
    },
  });
  return { deleted: `rows ${params.start_row}-${params.end_row}` };
}
