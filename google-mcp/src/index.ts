import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { listMessages, readMessage, createDraft, sendMessage } from "./tools/gmail.js";
import { listEvents, createEvent } from "./tools/calendar.js";
import { listFiles, readFile, uploadFile } from "./tools/drive.js";
import { createSheet, readSheet, updateCells, appendRows, clearRange, deleteRows } from "./tools/sheets.js";
import { createDoc, readDoc, appendDoc, replaceText } from "./tools/docs.js";
import { createPresentation, readPresentation, addSlide } from "./tools/slides.js";
import { createScript, getScript, updateScript } from "./tools/appsscript.js";

const server = new Server(
  { name: "google-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_messages",
      description: "List Gmail messages for an account",
      inputSchema: {
        type: "object",
        properties: {
          account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (create with: npm run auth -- --alias <name>). Examples: 'personal', 'work'." },
          max_results: { type: "number", description: "Max messages to return (default 10)" },
          query: { type: "string", description: "Gmail search query (e.g. 'is:unread')" },
        },
        required: ["account_alias"],
      },
    },
    {
      name: "read_message",
      description: "Read a Gmail message by ID",
      inputSchema: {
        type: "object",
        properties: {
          account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (create with: npm run auth -- --alias <name>). Examples: 'personal', 'work'." },
          message_id: { type: "string" },
        },
        required: ["account_alias", "message_id"],
      },
    },
    {
      name: "create_draft",
      description: "Create a Gmail draft",
      inputSchema: {
        type: "object",
        properties: {
          account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (create with: npm run auth -- --alias <name>). Examples: 'personal', 'work'." },
          to: { type: "string", description: "Recipient email" },
          subject: { type: "string" },
          body: { type: "string", description: "Plain text body" },
        },
        required: ["account_alias", "to", "subject", "body"],
      },
    },
    {
      name: "send_message",
      description: "Send an email via Gmail, optionally with file attachments",
      inputSchema: {
        type: "object",
        properties: {
          account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (create with: npm run auth -- --alias <name>). Examples: 'personal', 'work'." },
          to: { type: "string", description: "Recipient email" },
          subject: { type: "string" },
          body: { type: "string", description: "Plain text body (always include as fallback)" },
          html_body: { type: "string", description: "Optional HTML body — renders as rich email. Include plain text body too as fallback." },
          attachments: {
            type: "array",
            description: "Optional file attachments. Prefer 'path' to attach a local file directly (handles binaries like PDFs correctly).",
            items: {
              type: "object",
              properties: {
                path: { type: "string", description: "Absolute path to a local file to attach (read from disk; best for PDFs/binaries)" },
                filename: { type: "string", description: "Display name (defaults to the file's basename when 'path' is used)" },
                content: { type: "string", description: "Inline content instead of a path. Plain text by default; set is_base64:true if already base64" },
                is_base64: { type: "boolean", description: "Set true when 'content' is base64-encoded bytes" },
                mime_type: { type: "string", description: "MIME type (auto-detected from a path's extension when omitted)" },
              },
            },
          },
        },
        required: ["account_alias", "to", "subject", "body"],
      },
    },
    {
      name: "list_events",
      description: "List Google Calendar events",
      inputSchema: {
        type: "object",
        properties: {
          account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (create with: npm run auth -- --alias <name>). Examples: 'personal', 'work'." },
          calendar_id: { type: "string", description: "Calendar ID (default: 'primary')" },
          max_results: { type: "number" },
          time_min: { type: "string", description: "ISO 8601 start time filter (default: now)" },
        },
        required: ["account_alias"],
      },
    },
    {
      name: "create_event",
      description: "Create a Google Calendar event",
      inputSchema: {
        type: "object",
        properties: {
          account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (create with: npm run auth -- --alias <name>). Examples: 'personal', 'work'." },
          summary: { type: "string" },
          start: { type: "string", description: "ISO 8601 datetime" },
          end: { type: "string", description: "ISO 8601 datetime" },
          description: { type: "string" },
          location: { type: "string" },
          attendees: { type: "array", items: { type: "string" }, description: "Email addresses" },
          calendar_id: { type: "string" },
        },
        required: ["account_alias", "summary", "start", "end"],
      },
    },
    {
      name: "list_files",
      description: "List Google Drive files",
      inputSchema: {
        type: "object",
        properties: {
          account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (create with: npm run auth -- --alias <name>). Examples: 'personal', 'work'." },
          max_results: { type: "number" },
          query: { type: "string", description: "Drive search query (e.g. \"name contains 'report'\")" },
        },
        required: ["account_alias"],
      },
    },
    {
      name: "read_file",
      description: "Read a Google Drive file's content (supports Docs/Sheets/Slides export)",
      inputSchema: {
        type: "object",
        properties: {
          account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (create with: npm run auth -- --alias <name>). Examples: 'personal', 'work'." },
          file_id: { type: "string" },
        },
        required: ["account_alias", "file_id"],
      },
    },
    {
      name: "upload_file",
      description: "Upload a file to Google Drive",
      inputSchema: {
        type: "object",
        properties: {
          account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (create with: npm run auth -- --alias <name>). Examples: 'personal', 'work'." },
          name: { type: "string", description: "Filename" },
          content: { type: "string", description: "File content as text" },
          mime_type: { type: "string", description: "Source MIME type of the content (default: text/plain)" },
          google_mime_type: { type: "string", description: "Optional target Google type to convert to, e.g. 'application/vnd.google-apps.spreadsheet' for a native Sheet from CSV" },
          folder_id: { type: "string", description: "Parent folder ID (optional)" },
        },
        required: ["account_alias", "name", "content"],
      },
    },
    {
      name: "read_sheet",
      description: "Read a cell range from a Google Sheet (cell-precise).",
      inputSchema: { type: "object", properties: {
        account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (e.g. 'personal', 'work')" },
        spreadsheet_id: { type: "string", description: "The spreadsheet ID (from its URL)" },
        range: { type: "string", description: "A1 range, e.g. 'Sheet1!A1:F50' (default A1:Z1000)" },
      }, required: ["account_alias", "spreadsheet_id"] },
    },
    {
      name: "update_cells",
      description: "Write a 2-D array of values to a range in a Google Sheet (overwrites those cells).",
      inputSchema: { type: "object", properties: {
        account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (e.g. 'personal', 'work')" },
        spreadsheet_id: { type: "string" },
        range: { type: "string", description: "A1 range to write, e.g. 'Sheet1!A2:C2'" },
        values: { type: "array", description: "Rows of cell values (array of arrays)", items: { type: "array" } },
      }, required: ["account_alias", "spreadsheet_id", "range", "values"] },
    },
    {
      name: "create_sheet",
      description: "Create a NEW Google Sheet (spreadsheet), optionally with a bolded+frozen header row. Returns spreadsheet_id + url — save the id for later read/append/update calls.",
      inputSchema: { type: "object", properties: {
        account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (e.g. 'personal', 'work')" },
        title: { type: "string", description: "Spreadsheet title (shows in Drive)" },
        header: { type: "array", description: "Optional header row, e.g. ['#','Employer','Location']", items: { type: "string" } },
        tab_title: { type: "string", description: "Optional name for the first tab" },
      }, required: ["account_alias", "title"] },
    },
    {
      name: "append_rows",
      description: "Append rows to the end of a Google Sheet.",
      inputSchema: { type: "object", properties: {
        account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (e.g. 'personal', 'work')" },
        spreadsheet_id: { type: "string" },
        range: { type: "string", description: "Anchor range/tab, e.g. 'Sheet1!A1' (default A1)" },
        values: { type: "array", description: "Rows to append (array of arrays)", items: { type: "array" } },
      }, required: ["account_alias", "spreadsheet_id", "values"] },
    },
    {
      name: "clear_range",
      description: "Clear the values in a range (empties cells, keeps the rows).",
      inputSchema: { type: "object", properties: {
        account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (e.g. 'personal', 'work')" },
        spreadsheet_id: { type: "string" },
        range: { type: "string", description: "A1 range to clear" },
      }, required: ["account_alias", "spreadsheet_id", "range"] },
    },
    {
      name: "delete_rows",
      description: "Delete entire rows (1-based inclusive; row 1 = header). e.g. start_row 2, end_row 10 removes rows 2-10.",
      inputSchema: { type: "object", properties: {
        account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (e.g. 'personal', 'work')" },
        spreadsheet_id: { type: "string" },
        sheet_title: { type: "string", description: "Tab name (default: first tab)" },
        start_row: { type: "number", description: "First row to delete (1-based, inclusive)" },
        end_row: { type: "number", description: "Last row to delete (1-based, inclusive)" },
      }, required: ["account_alias", "spreadsheet_id", "start_row", "end_row"] },
    },
    {
      name: "create_doc",
      description: "Create a Google Doc, optionally seeded with body text.",
      inputSchema: { type: "object", properties: {
        account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (e.g. 'personal', 'work')" },
        title: { type: "string", description: "Document title" },
        text: { type: "string", description: "Optional initial body text" },
      }, required: ["account_alias", "title"] },
    },
    {
      name: "read_doc",
      description: "Read a Google Doc's plain-text content.",
      inputSchema: { type: "object", properties: {
        account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (e.g. 'personal', 'work')" },
        document_id: { type: "string", description: "The document ID (from its URL)" },
      }, required: ["account_alias", "document_id"] },
    },
    {
      name: "append_doc",
      description: "Append text to the end of a Google Doc.",
      inputSchema: { type: "object", properties: {
        account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (e.g. 'personal', 'work')" },
        document_id: { type: "string" },
        text: { type: "string", description: "Text to append" },
      }, required: ["account_alias", "document_id", "text"] },
    },
    {
      name: "replace_text",
      description: "Find-and-replace all occurrences of a string in a Google Doc (good for templates).",
      inputSchema: { type: "object", properties: {
        account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (e.g. 'personal', 'work')" },
        document_id: { type: "string" },
        find: { type: "string", description: "Text to find" },
        replace: { type: "string", description: "Replacement text" },
        match_case: { type: "boolean", description: "Case-sensitive match (default false)" },
      }, required: ["account_alias", "document_id", "find", "replace"] },
    },
    {
      name: "create_presentation",
      description: "Create a new Google Slides presentation.",
      inputSchema: { type: "object", properties: {
        account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (e.g. 'personal', 'work')" },
        title: { type: "string", description: "Presentation title" },
      }, required: ["account_alias", "title"] },
    },
    {
      name: "read_presentation",
      description: "Read a Google Slides deck: per-slide object IDs and extracted text.",
      inputSchema: { type: "object", properties: {
        account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (e.g. 'personal', 'work')" },
        presentation_id: { type: "string", description: "The presentation ID (from its URL)" },
      }, required: ["account_alias", "presentation_id"] },
    },
    {
      name: "add_slide",
      description: "Add a slide (TITLE_AND_BODY layout) to a presentation, optionally filling title/body text.",
      inputSchema: { type: "object", properties: {
        account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (e.g. 'personal', 'work')" },
        presentation_id: { type: "string" },
        title: { type: "string", description: "Optional slide title text" },
        body: { type: "string", description: "Optional slide body text" },
      }, required: ["account_alias", "presentation_id"] },
    },
    {
      name: "create_script",
      description: "Create an Apps Script project (standalone, or container-bound if parent_id is a Doc/Sheet/Slide ID). Requires the Apps Script API enabled at script.google.com/home/usersettings.",
      inputSchema: { type: "object", properties: {
        account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (e.g. 'personal', 'work')" },
        title: { type: "string", description: "Project title" },
        parent_id: { type: "string", description: "Optional Drive file ID to bind the script to" },
      }, required: ["account_alias", "title"] },
    },
    {
      name: "get_script",
      description: "Read an Apps Script project's source files (name, type, source).",
      inputSchema: { type: "object", properties: {
        account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (e.g. 'personal', 'work')" },
        script_id: { type: "string", description: "The script project ID" },
      }, required: ["account_alias", "script_id"] },
    },
    {
      name: "update_script",
      description: "Overwrite an Apps Script project's source files. Must include a manifest file named 'appsscript' of type JSON.",
      inputSchema: { type: "object", properties: {
        account_alias: { type: "string", description: "Token alias matching a file in .tokens/ (e.g. 'personal', 'work')" },
        script_id: { type: "string" },
        files: {
          type: "array",
          description: "Full file set to write (replaces existing). Each: { name, type: SERVER_JS|HTML|JSON, source }",
          items: { type: "object", properties: {
            name: { type: "string" },
            type: { type: "string", description: "SERVER_JS | HTML | JSON" },
            source: { type: "string" },
          }, required: ["name", "type", "source"] },
        },
      }, required: ["account_alias", "script_id", "files"] },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  try {
    let result: unknown;

    switch (name) {
      case "list_messages":
        result = await listMessages(args as any);
        break;
      case "read_message":
        result = await readMessage(args as any);
        break;
      case "create_draft":
        result = await createDraft(args as any);
        break;
      case "send_message":
        result = await sendMessage(args as any);
        break;
      case "list_events":
        result = await listEvents(args as any);
        break;
      case "create_event":
        result = await createEvent(args as any);
        break;
      case "list_files":
        result = await listFiles(args as any);
        break;
      case "read_file":
        result = await readFile(args as any);
        break;
      case "upload_file":
        result = await uploadFile(args as any);
        break;
      case "create_sheet":
        result = await createSheet(args as any);
        break;
      case "read_sheet":
        result = await readSheet(args as any);
        break;
      case "update_cells":
        result = await updateCells(args as any);
        break;
      case "append_rows":
        result = await appendRows(args as any);
        break;
      case "clear_range":
        result = await clearRange(args as any);
        break;
      case "delete_rows":
        result = await deleteRows(args as any);
        break;
      case "create_doc":
        result = await createDoc(args as any);
        break;
      case "read_doc":
        result = await readDoc(args as any);
        break;
      case "append_doc":
        result = await appendDoc(args as any);
        break;
      case "replace_text":
        result = await replaceText(args as any);
        break;
      case "create_presentation":
        result = await createPresentation(args as any);
        break;
      case "read_presentation":
        result = await readPresentation(args as any);
        break;
      case "add_slide":
        result = await addSlide(args as any);
        break;
      case "create_script":
        result = await createScript(args as any);
        break;
      case "get_script":
        result = await getScript(args as any);
        break;
      case "update_script":
        result = await updateScript(args as any);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
