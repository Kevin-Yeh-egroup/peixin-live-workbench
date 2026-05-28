import { google } from "googleapis";
import { analyzeCourse, analyzeExpense, cleanHeader } from "@/lib/analyze";
import { getGoogleConfig, getSheetConfig } from "@/lib/env";
import type { DashboardPayload, SheetRow, SheetSourceSummary } from "@/lib/types";

type SheetRuntimeConfig = ReturnType<typeof getSheetConfig>;
type SheetRuntimeSource = SheetRuntimeConfig["course"] | SheetRuntimeConfig["expense"];

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

function getSheetsClient() {
  if (sheetsClient) return sheetsClient;
  const { clientEmail, privateKey } = getGoogleConfig();
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

export async function getDashboardData(): Promise<DashboardPayload> {
  const config = getSheetConfig();
  const [coursePayload, expensePayload] = await Promise.all([
    readSheet(config.course),
    readSheet(config.expense),
  ]);

  const sources: SheetSourceSummary[] = [
    sourceSummary(config.course, coursePayload),
    sourceSummary(config.expense, expensePayload),
  ];

  return {
    generatedAt: new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date()),
    sources,
    course: {
      headers: coursePayload.headers,
      rows: coursePayload.rows.map(analyzeCourse),
    },
    expense: {
      headers: expensePayload.headers,
      rows: expensePayload.rows.map((row) => analyzeExpense(row, expensePayload.headers)),
    },
  };
}

async function readSheet(source: SheetRuntimeSource): Promise<{
  headers: string[];
  rows: SheetRow[];
  rowsTotal: number;
  columnsTotal: number;
}> {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: source.spreadsheetId,
    range: source.range,
    valueRenderOption: "FORMATTED_VALUE",
  });
  const values = response.data.values || [];
  const headers = (values[0] || []).map(cleanHeader);
  const bodyRows = values.slice(1);
  const startIndex = Math.max(0, bodyRows.length - source.rowLimit);
  const latestRows = bodyRows.slice(startIndex);

  const rows = latestRows
    .map((cells, index) => toRow(headers, cells, startIndex + index + 2))
    .filter((row) => row.__filled === "true")
    .map(({ __filled: _filled, ...row }) => row as SheetRow);

  return {
    headers,
    rows,
    rowsTotal: values.length,
    columnsTotal: headers.length,
  };
}

function toRow(headers: string[], cells: string[], rowNumber: number): SheetRow {
  const row: SheetRow = {
    __rowNumber: String(rowNumber),
    __filled: "false",
  };

  headers.forEach((header, index) => {
    const value = String(cells[index] || "").trim();
    if (value) row.__filled = "true";
    row[header] = value;
  });

  return row;
}

function sourceSummary(
  source: SheetRuntimeSource,
  payload: { rows: SheetRow[]; rowsTotal: number; columnsTotal: number },
): SheetSourceSummary {
  return {
    kind: source.kind,
    label: source.label,
    title: source.title,
    sheetName: source.sheetName,
    url: `https://docs.google.com/spreadsheets/d/${source.spreadsheetId}/edit?gid=${source.gid}#gid=${source.gid}`,
    csvUrl: `https://docs.google.com/spreadsheets/d/${source.spreadsheetId}/export?format=csv&gid=${source.gid}`,
    rows: payload.rowsTotal,
    columns: payload.columnsTotal,
    loadedRows: payload.rows.length,
  };
}
