import ExcelJS from "exceljs";
import { MonthlyReport } from "./types";

export async function buildMonthlyWorkbook(report: MonthlyReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const summary = workbook.addWorksheet("Xulosa");
  summary.columns = [{ width: 28 }, { width: 20 }];
  summary.addRow([`Moliyaviy natija: ${report.monthLabel}`]).font = { bold: true, size: 14 };
  summary.addRow([]);
  summary.addRow(["Jami xarajat", report.totalExpense]);
  summary.addRow(["Jami daromad", report.totalIncome]);
  const profitRow = summary.addRow([report.profit >= 0 ? "Foyda" : "Zarar", Math.abs(report.profit)]);
  profitRow.font = { bold: true };
  summary.addRow([]);
  summary.addRow(["Kategoriya", "Summa"]).font = { bold: true };
  for (const c of report.categoryTotals) {
    summary.addRow([c.category, c.amount]);
  }
  summary.addRow([]);
  summary.addRow(["Hafta", "Xarajat", "Daromad"]).font = { bold: true };
  for (const w of report.weeklyTotals) {
    summary.addRow([w.label, w.expense, w.income]);
  }

  const details = workbook.addWorksheet("Tafsilotlar");
  details.columns = [
    { header: "Sana", key: "date", width: 14 },
    { header: "Turi", key: "type", width: 12 },
    { header: "Kategoriya", key: "category", width: 18 },
    { header: "Summa", key: "amount", width: 14 },
    { header: "Izoh", key: "note", width: 30 },
    { header: "Foydalanuvchi", key: "user", width: 18 },
  ];
  details.getRow(1).font = { bold: true };
  for (const row of report.rows) {
    details.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
