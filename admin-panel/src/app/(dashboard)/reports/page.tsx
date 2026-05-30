"use client";
import { useEffect, useState } from "react";
import { Download, BarChart3, Users, TrendingUp } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/formatters";

export default function ReportsPage() {
  const [salesReport, setSalesReport] = useState<any>(null);
  const [agentReport, setAgentReport] = useState<any[]>([]);
  const [debtReport, setDebtReport] = useState<any>(null);
  const [tab, setTab] = useState("sales");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/reports/sales"),
      api.get("/reports/agents"),
      api.get("/reports/debts"),
    ]).then(([s, a, d]) => {
      setSalesReport(s.data);
      setAgentReport(a.data);
      setDebtReport(d.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>;

  const tabs = [
    { id: "sales", label: "Savdo Hisoboti", icon: BarChart3 },
    { id: "agents", label: "Agent Hisoboti", icon: Users },
    { id: "debts", label: "Qarz Hisoboti", icon: TrendingUp },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Hisobotlar</h2>
        <button className="btn-secondary"><Download className="w-4 h-4" />Export Excel</button>
      </div>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t.id ? "bg-brand-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === "sales" && salesReport && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Jami Daromad", value: formatCurrency(salesReport.totalRevenue) + " so'm", color: "text-green-600" },
              { label: "Jami Buyurtmalar", value: salesReport.totalOrders, color: "text-blue-600" },
              { label: "Yetkazilgan", value: salesReport.deliveredOrders, color: "text-brand-600" },
              { label: "Bekor qilingan", value: salesReport.cancelledOrders, color: "text-red-600" },
            ].map(s => (
              <div key={s.label} className="kpi-card">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">Oylik Savdo Trendi</div>
            <table className="w-full data-table">
              <thead><tr><th>Oy</th><th>Daromad</th><th>Buyurtmalar</th><th>Mijozlar</th></tr></thead>
              <tbody>
                {[...salesReport.monthlySales].reverse().map((m: any) => (
                  <tr key={m.month}>
                    <td className="font-medium">{m.month}</td>
                    <td className="font-semibold text-green-600">{formatCurrency(m.revenue)} so'm</td>
                    <td>{m.orders} ta</td>
                    <td>{m.customers} ta</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "agents" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full data-table">
            <thead><tr><th>Agent</th><th>Hudud</th><th>Buyurtmalar</th><th>Daromad</th><th>Maqsad</th><th>Samaradorlik</th><th>Mijozlar</th></tr></thead>
            <tbody>
              {agentReport.sort((a, b) => b.performance - a.performance).map((a) => (
                <tr key={a.agentId}>
                  <td className="font-medium text-gray-900">{a.agentName}</td>
                  <td className="text-gray-500">{a.territory}</td>
                  <td>{a.orders} ta</td>
                  <td className="font-semibold text-green-600">{formatCurrency(a.revenue)} so'm</td>
                  <td className="text-gray-500">{formatCurrency(a.target)} so'm</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${a.performance >= 90 ? "bg-green-500" : a.performance >= 75 ? "bg-blue-500" : "bg-amber-400"}`} style={{ width: `${a.performance}%` }} />
                      </div>
                      <span className="text-xs font-medium">{formatPercent(a.performance)}</span>
                    </div>
                  </td>
                  <td>{a.customersCount} ta</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "debts" && debtReport && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="kpi-card"><div className="text-2xl font-bold text-red-600">{formatCurrency(debtReport.totalDebt)} so'm</div><div className="text-sm text-gray-500 mt-1">Jami qarz</div></div>
            <div className="kpi-card"><div className="text-2xl font-bold text-green-600">{formatCurrency(debtReport.totalCollections)} so'm</div><div className="text-sm text-gray-500 mt-1">Yig'ilgan</div></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full data-table">
              <thead><tr><th>Mijoz</th><th>Telefon</th><th>Hudud</th><th>Qarz</th><th>Agent</th><th>Holat</th></tr></thead>
              <tbody>
                {debtReport.debtCustomers.map((d: any) => (
                  <tr key={d.customerId}>
                    <td className="font-medium text-gray-900">{d.customerName}</td>
                    <td className="text-gray-500">{d.phone}</td>
                    <td className="text-gray-500">{d.district}</td>
                    <td className="font-bold text-red-600">{formatCurrency(d.debt)} so'm</td>
                    <td className="text-gray-500">{d.agentName}</td>
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
        </div>
      )}
    </div>
  );
}
