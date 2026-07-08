import { google, sheets_v4 } from "googleapis";
import { DebtFields, FactoryPaymentFields, FinalReportSummary } from "./types";

const EXPENSE_SHEET = "Оборотка";
const EXPENSE_DATE_COL = "A"; // authoritative calendar-day column already filled in the workbook
const EXPENSE_VALUE_RANGE = "W"; // сумма — summed by the existing Якуний хисобот formula
const EXPENSE_TYPE_RANGE = "X"; // харажат тури
const EXPENSE_SCAN_ROWS = 400; // generous buffer past the current ~160-row block
const BANK_RECEIPT_COL = "K"; // Банкга келиб тушган — same date-indexed rows as the expense block

const FACTORY_DATE_COL = "P";
const FACTORY_SUPPLIER_COL = "Q";
const FACTORY_AMOUNT_COL = "R";
const FACTORY_NOTE_COL = "S";
const FACTORY_MAX_ROW = 33; // matches Якуний хисобот's SUMIF(Оборотка!Q3:Q33, ...) range exactly

const DEBT_SHEET = "карз";
const DEBT_SCAN_ROWS = 500;

const REPORT_SHEET = "Якуний хисобот";

export class DateNotPreparedError extends Error {
  constructor(date: Date) {
    super(`Bu sana (${date.toISOString().slice(0, 10)}) uchun "${EXPENSE_SHEET}" varag'ida tayyor qator topilmadi.`);
    this.name = "DateNotPreparedError";
  }
}

export class SheetCapacityError extends Error {}

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

export interface BankReceiptResult {
  row: number;
  previousAmount: number | null;
}

// Overwrites (not accumulates) the bank receipt figure for a day — it represents a single
// confirmed total, not a running sum of separate entries.
export async function setBankReceipt(date: Date, amount: number): Promise<BankReceiptResult> {
  const sheets = await getClient();
  const id = spreadsheetId();
  const row = await findRowForDate(date);

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${EXPENSE_SHEET}!${BANK_RECEIPT_COL}${row}`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const existingVal = existing.data.values?.[0]?.[0];
  const previousAmount = typeof existingVal === "number" ? existingVal : null;

  await sheets.spreadsheets.values.update({
    spreadsheetId: id,
    range: `${EXPENSE_SHEET}!${BANK_RECEIPT_COL}${row}`,
    valueInputOption: "RAW",
    requestBody: { values: [[amount]] },
  });

  return { row, previousAmount };
}

async function findEmptyFactoryRow(): Promise<number> {
  const sheets = await getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${EXPENSE_SHEET}!${FACTORY_SUPPLIER_COL}3:${FACTORY_SUPPLIER_COL}${FACTORY_MAX_ROW}`,
  });
  const values = res.data.values ?? [];
  for (let row = 3; row <= FACTORY_MAX_ROW; row++) {
    if (!values[row - 3]?.[0]) return row;
  }
  throw new SheetCapacityError(
    `"${EXPENSE_SHEET}" varag'ida zavodga to'lov uchun bo'sh joy qolmadi (${FACTORY_MAX_ROW}-qatorgacha to'lgan). Administratorga murojaat qiling.`
  );
}

export async function appendFactoryPayment(fields: FactoryPaymentFields): Promise<{ row: number }> {
  const sheets = await getClient();
  const id = spreadsheetId();
  const row = await findEmptyFactoryRow();
  const date = fields.date ?? new Date();

  await sheets.spreadsheets.values.update({
    spreadsheetId: id,
    range: `${EXPENSE_SHEET}!${FACTORY_DATE_COL}${row}:${FACTORY_NOTE_COL}${row}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[date.toISOString().slice(0, 10), fields.supplier, fields.amount, fields.note ?? ""]] },
  });

  return { row };
}

async function findEmptyDebtRow(): Promise<number> {
  const sheets = await getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${DEBT_SHEET}!A3:C${DEBT_SCAN_ROWS}`,
  });
  const values = res.data.values ?? [];
  for (let i = 0; i < values.length; i++) {
    const label = String(values[i]?.[0] ?? "").trim().toLowerCase();
    if (label === "жами") break;
    if (!values[i]?.[2]) return i + 3; // column C (Фирма) empty = unused row
  }
  throw new SheetCapacityError(
    `"${DEBT_SHEET}" varag'ida yangi qarz yozuvi uchun bo'sh joy qolmadi. Administratorga murojaat qiling.`
  );
}

export async function appendDebtEntry(fields: DebtFields): Promise<{ row: number }> {
  const sheets = await getClient();
  const id = spreadsheetId();
  const row = await findEmptyDebtRow();
  const date = fields.date ?? new Date();

  await sheets.spreadsheets.values.update({
    spreadsheetId: id,
    range: `${DEBT_SHEET}!A${row}:I${row}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          fields.invoiceNo ?? "",
          date.toISOString().slice(0, 10),
          fields.company,
          fields.phone ?? "",
          fields.district ?? "",
          fields.rep ?? "",
          fields.amount,
          fields.paid ?? 0,
          `=G${row}-H${row}`,
        ],
      ],
    },
  });

  return { row };
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
