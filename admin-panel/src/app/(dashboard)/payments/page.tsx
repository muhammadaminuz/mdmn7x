"use client";
import { useEffect, useState } from "react";
import { CreditCard, Banknote, Building2, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { Payment } from "@/types";

const methodIcons: Record<string, React.ReactNode> = {
  CASH: <Banknote className="w-4 h-4 text-green-600" />,
  CARD: <CreditCard className="w-4 h-4 text-blue-600" />,
  BANK_TRANSFER: <Building2 className="w-4 h-4 text-purple-600" />,
  CHEQUE: <CreditCard className="w-4 h-4 text-amber-600" />,
};
const methodLabels: Record<string, string> = {
  CASH: "Naqd", CARD: "Karta", BANK_TRANSFER: "Bank o'tkazmasi", CHEQUE: "Chek",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [tab, setTab] = useState<"payments" | "debts">("payments");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/payments"), api.get("/payments/debts")])
      .then(([pr, dr]) => { setPayments(pr.data.items); setDebts(dr.data); })
      .finally(() => setLoading(false));
  }, []);

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const totalDebt = debts.reduce((s: number, d: any) => s + d.totalDebt, 0);

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">To'lovlar va Qarzlar</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Jami To'lovlar", value: formatCurrency(totalPaid) + " so'm", color: "text-green-600" },
          { label: "Qarzli Mijozlar", value: debts.length + " ta", color: "text-red-600" },
          { label: "Jami Qarz", value: formatCurrency(totalDebt) + " so'm", color: "text-red-600" },
          { label: "Kritik Qarzlar", value: debts.filter((d: any) => d.status === "CRITICAL").length + " ta", color: "text-red-700" },
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {(["payments", "debts"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? "bg-brand-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {t === "payments" ? "To'lovlar tarixi" : "Qarzlar ro'yxati"}
          </button>
        ))}
      </div>

      {tab === "payments" ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full data-table">
            <thead><tr><th>Mijoz</th><th>Summa</th><th>Usul</th><th>Agent</th><th>Izoh</th><th>Sana</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium text-gray-900">{p.customerName}</td>
                  <td className="font-bold text-green-600">{formatCurrency(p.amount)} so'm</td>
                  <td><div className="flex items-center gap-1.5">{methodIcons[p.method]}<span className="text-sm">{methodLabels[p.method]}</span></div></td>
                  <td className="text-gray-500">Agent #{p.agentId}</td>
                  <td className="text-gray-400 text-xs">{p.note || "—"}</td>
                  <td className="text-gray-400 text-xs">{formatDateTime(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full data-table">
            <thead><tr><th>Mijoz</th><th>Telefon</th><th>Qarz miqdori</th><th>Holat</th></tr></thead>
            <tbody>
              {debts.map((d: any) => (
                <tr key={d.customerId}>
                  <td className="font-medium text-gray-900">{d.customerName}</td>
                  <td className="text-gray-500">{d.phone}</td>
                  <td className="font-bold text-red-600">{formatCurrency(d.totalDebt)} so'm</td>
                  <td>
                    <span className={`status-badge ${d.status === "CRITICAL" ? "bg-red-100 text-red-700" : d.status === "OVERDUE" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                      {d.status === "CRITICAL" ? "Kritik" : d.status === "OVERDUE" ? "Muddati o'tgan" : "Joriy"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
