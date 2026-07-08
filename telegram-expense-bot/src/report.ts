import { LedgerRow, MonthlyReport } from "./types";

const MONTH_NAMES = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];

export function buildMonthlyReport(rows: LedgerRow[], year: number, month: number): MonthlyReport {
  const monthRows = rows.filter((r) => {
    const d = new Date(r.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const totalExpense = sum(monthRows.filter((r) => r.type === "Xarajat"));
  const totalIncome = sum(monthRows.filter((r) => r.type === "Daromad"));

  const categoryMap = new Map<string, number>();
  for (const row of monthRows.filter((r) => r.type === "Xarajat")) {
    categoryMap.set(row.category, (categoryMap.get(row.category) ?? 0) + row.amount);
  }
  const categoryTotals = [...categoryMap.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const weeklyMap = new Map<number, { expense: number; income: number }>();
  for (const row of monthRows) {
    const day = new Date(row.date).getDate();
    const week = Math.floor((day - 1) / 7); // 0-indexed week within month
    const entry = weeklyMap.get(week) ?? { expense: 0, income: 0 };
    if (row.type === "Xarajat") entry.expense += row.amount;
    else entry.income += row.amount;
    weeklyMap.set(week, entry);
  }
  const weeklyTotals = [...weeklyMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, totals]) => ({
      label: `${week + 1}-hafta`,
      expense: totals.expense,
      income: totals.income,
    }));

  return {
    monthLabel: `${MONTH_NAMES[month]} ${year}`,
    totalExpense,
    totalIncome,
    profit: totalIncome - totalExpense,
    categoryTotals,
    weeklyTotals,
    rows: monthRows.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

function sum(rows: LedgerRow[]): number {
  return rows.reduce((acc, r) => acc + r.amount, 0);
}

export function formatReportText(report: MonthlyReport): string {
  const fmt = (n: number) => n.toLocaleString("ru-RU").replace(/,/g, " ");

  const lines: string[] = [];
  lines.push(`📊 *${report.monthLabel} uchun moliyaviy natija*`);
  lines.push("");
  lines.push(`💸 Jami xarajat: ${fmt(report.totalExpense)} so'm`);
  lines.push(`💰 Jami daromad: ${fmt(report.totalIncome)} so'm`);
  lines.push(
    report.profit >= 0
      ? `✅ Foyda: ${fmt(report.profit)} so'm`
      : `⚠️ Zarar: ${fmt(Math.abs(report.profit))} so'm`
  );

  if (report.categoryTotals.length > 0) {
    lines.push("");
    lines.push("📂 *Kategoriya bo'yicha xarajatlar:*");
    for (const c of report.categoryTotals) {
      lines.push(`  • ${c.category}: ${fmt(c.amount)} so'm`);
    }
  }

  if (report.weeklyTotals.length > 0) {
    lines.push("");
    lines.push("📈 *Haftalik dinamika:*");
    for (const w of report.weeklyTotals) {
      lines.push(`  • ${w.label}: xarajat ${fmt(w.expense)} / daromad ${fmt(w.income)}`);
    }
  }

  if (report.rows.length === 0) {
    lines.push("");
    lines.push("Bu oy uchun hali yozuvlar yo'q.");
  }

  return lines.join("\n");
}
