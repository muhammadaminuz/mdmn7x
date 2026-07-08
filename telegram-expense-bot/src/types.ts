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

export type FieldType = "text" | "number" | "date" | "choice";

export interface FieldDef {
  key: string;
  prompt: string;
  type: FieldType;
  optional?: boolean;
  choices?: string[];
}

export type FormFlow = "debt" | "factory" | "bank";

export interface ActiveForm {
  flow: FormFlow;
  fields: FieldDef[];
  index: number;
  values: Record<string, string | number | Date>;
}

export interface DebtFields {
  company: string;
  amount: number;
  paid?: number;
  phone?: string;
  district?: string;
  rep?: string;
  invoiceNo?: string;
  date?: Date;
}

export interface FactoryPaymentFields {
  supplier: string;
  amount: number;
  note?: string;
  date?: Date;
}
