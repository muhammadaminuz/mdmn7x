export interface ParsedExpense {
  amount: number;
  category: string;
  date: Date;
}

export interface DraftExpense {
  amount: number;
  category: string;
  date: Date;
  rawText: string;
}

export interface FinalReportSummary {
  title: string;
  totalRevenue: number | null;
  totalExpense: number | null;
  netSales: number | null;
}
