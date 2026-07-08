export type EntryType = "Xarajat" | "Daromad";

export interface LedgerRow {
  date: string; // ISO date, YYYY-MM-DD
  type: EntryType;
  category: string;
  amount: number;
  note: string;
  user: string;
}

export interface DraftEntry {
  type: EntryType;
  amount?: number;
  category?: string;
  step: "amount" | "category" | "note";
}

export interface MonthlyReport {
  monthLabel: string;
  totalExpense: number;
  totalIncome: number;
  profit: number;
  categoryTotals: { category: string; amount: number }[];
  weeklyTotals: { label: string; expense: number; income: number }[];
  rows: LedgerRow[];
}
