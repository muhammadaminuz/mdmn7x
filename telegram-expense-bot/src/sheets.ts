import { google, sheets_v4 } from "googleapis";
import { LedgerRow } from "./types";

const SHEET_NAME = "Yozuvlar";
const HEADER = ["Sana", "Turi", "Kategoriya", "Summa", "Izoh", "Foydalanuvchi"];

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

export async function ensureSheetReady(): Promise<void> {
  const sheets = await getClient();
  const id = spreadsheetId();

  const meta = await sheets.spreadsheets.get({ spreadsheetId: id });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === SHEET_NAME);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: id,
      requestBody: {
        requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
      },
    });
  }

  const existingHeader = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${SHEET_NAME}!A1:F1`,
  });

  if (!existingHeader.data.values || existingHeader.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: `${SHEET_NAME}!A1:F1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADER] },
    });
  }
}

export async function appendRow(row: LedgerRow): Promise<void> {
  const sheets = await getClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId(),
    range: `${SHEET_NAME}!A:F`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[row.date, row.type, row.category, row.amount, row.note, row.user]],
    },
  });
}

export async function fetchAllRows(): Promise<LedgerRow[]> {
  const sheets = await getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${SHEET_NAME}!A2:F`,
  });

  const values = res.data.values ?? [];
  return values
    .filter((r) => r.length >= 4 && r[0])
    .map((r) => ({
      date: String(r[0]),
      type: r[1] === "Daromad" ? "Daromad" : "Xarajat",
      category: String(r[2] ?? ""),
      amount: Number(r[3]) || 0,
      note: String(r[4] ?? ""),
      user: String(r[5] ?? ""),
    }));
}
