import { google, sheets_v4 } from "googleapis";
import { FinalReportSummary } from "./types";

const EXPENSE_SHEET = "Оборотка";
const EXPENSE_DATE_COL = "A"; // authoritative calendar-day column already filled in the workbook
const EXPENSE_VALUE_RANGE = "W"; // сумма — summed by the existing Якуний хисобот formula
const EXPENSE_TYPE_RANGE = "X"; // харажат тури
const EXPENSE_SCAN_ROWS = 400; // generous buffer past the current ~160-row block

const REPORT_SHEET = "Якуний хисобот";

export class DateNotPreparedError extends Error {
  constructor(date: Date) {
    super(`Bu sana (${date.toISOString().slice(0, 10)}) uchun "${EXPENSE_SHEET}" varag'ida tayyor qator topilmadi.`);
    this.name = "DateNotPreparedError";
  }
}

let sheetsClient: sheets_v4.Sheets | null = null;

async function getClient(): Promise<sheets_v4.Sheets> {
  if (sheetsClient) return sheetsClient;
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

function spreadsheetId(): string {
  const id = process.env.SPREADSHEET_ID;
  if (!id) throw new Error("SPREADSHEET_ID is not set");
  return id;
}

// Compared using UTC calendar day: serial-decoded sheet dates are UTC midnight,
// so both sides must use UTC getters to avoid off-by-one-day drift from server timezone.
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

// Sheets/Excel date serial epoch: serial 0 == 1899-12-30 (UTC).
const SERIAL_EPOCH_MS = Date.UTC(1899, 11, 30);

function serialToDate(serial: number): Date {
  return new Date(SERIAL_EPOCH_MS + serial * 86400000);
}

async function findRowForDate(date: Date): Promise<number> {
  const sheets = await getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${EXPENSE_SHEET}!${EXPENSE_DATE_COL}3:${EXPENSE_DATE_COL}${EXPENSE_SCAN_ROWS}`,
    valueRenderOption: "UNFORMATTED_VALUE", // returns raw date serial numbers, unambiguous across cell display formats
  });

  const values = res.data.values ?? [];
  for (let i = 0; i < values.length; i++) {
    const raw = values[i][0];
    if (typeof raw !== "number") continue;
    if (sameDay(serialToDate(raw), date)) {
      return i + 3; // account for header rows 1-2
    }
  }
  throw new DateNotPreparedError(date);
}

export interface AppendResult {
  row: number;
  totalForDay: number;
  categoriesForDay: string;
}

export async function appendOrAccumulateExpense(date: Date, amount: number, category: string): Promise<AppendResult> {
  const sheets = await getClient();
  const id = spreadsheetId();
  const row = await findRowForDate(date);

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${EXPENSE_SHEET}!${EXPENSE_VALUE_RANGE}${row}:${EXPENSE_TYPE_RANGE}${row}`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const [existingAmount, existingCategory] = existing.data.values?.[0] ?? [];
  const totalForDay = (Number(existingAmount) || 0) + amount;
  const categoriesForDay = existingCategory ? `${existingCategory}, ${category}` : category;

  await sheets.spreadsheets.values.update({
    spreadsheetId: id,
    range: `${EXPENSE_SHEET}!${EXPENSE_VALUE_RANGE}${row}:${EXPENSE_TYPE_RANGE}${row}`,
    valueInputOption: "RAW",
    requestBody: { values: [[totalForDay, categoriesForDay]] },
  });

  return { row, totalForDay, categoriesForDay };
}

const sheetGidCache = new Map<string, number>();

async function getSheetGid(sheetName: string): Promise<number | undefined> {
  if (sheetGidCache.has(sheetName)) return sheetGidCache.get(sheetName);

  const sheets = await getClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: spreadsheetId() });
  for (const s of meta.data.sheets ?? []) {
    if (s.properties?.title && s.properties.sheetId !== undefined && s.properties.sheetId !== null) {
      sheetGidCache.set(s.properties.title, s.properties.sheetId);
    }
  }
  return sheetGidCache.get(sheetName);
}

// Deep-links straight to the expenses tab so tapping it in Telegram opens the right place.
export async function getSheetUrl(sheetName: string = EXPENSE_SHEET): Promise<string> {
  const gid = await getSheetGid(sheetName);
  const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId()}/edit`;
  return gid !== undefined ? `${base}#gid=${gid}` : base;
}

export async function getFinalReportSummary(): Promise<FinalReportSummary> {
  const sheets = await getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${REPORT_SHEET}!A1:B45`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const rows = res.data.values ?? [];
  const title = String(rows[0]?.[0] ?? REPORT_SHEET);

  const findValue = (label: string): number | null => {
    const match = rows.find((r) => String(r[0] ?? "").trim().toLowerCase().startsWith(label.toLowerCase()));
    const val = match?.[1];
    return typeof val === "number" ? val : val ? Number(val) : null;
  };

  return {
    title,
    totalRevenue: findValue("Жами тушум"),
    totalExpense: findValue("Жами харажат"),
    netSales: findValue("Соф сотиш"),
  };
}
