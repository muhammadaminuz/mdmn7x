"use client";
import { useEffect, useState } from "react";
import { Users, AlertCircle, TrendingUp, Star } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/formatters";

export default function CRMPage() {
  const [summary, setSummary] = useState<any>(null);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [aging, setAging] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/crm/summary"),
      api.get("/crm/top-customers"),
      api.get("/crm/debt-aging"),
    ]).then(([s, t, a]) => {
      setSummary(s.data);
      setTopCustomers(t.data);
      setAging(a.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">CRM – Mijozlar Munosabatlari</h2>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Jami Mijozlar", value: summary.totalCustomers, color: "text-blue-600", bg: "bg-blue-50", icon: Users },
          { label: "Faol Mijozlar", value: summary.activeCustomers, color: "text-green-600", bg: "bg-green-50", icon: TrendingUp },
          { label: "Qarzli Mijozlar", value: summary.criticalDebtors + " ta kritik", color: "text-red-600", bg: "bg-red-50", icon: AlertCircle },
          { label: "Jami Balans", value: formatCurrency(summary.totalBalance) + " so'm", color: "text-purple-600", bg: "bg-purple-50", icon: Star },
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Customers */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-gray-900">Top 10 Mijozlar</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead><tr><th>#</th><th>Mijoz</th><th>Buyurtmalar</th><th>Daromad</th></tr></thead>
              <tbody>
                {topCustomers.map((c, i) => (
                  <tr key={c.id}>
                    <td className="font-bold text-amber-600">#{i + 1}</td>
                    <td>
                      <div className="font-medium text-gray-900">{c.companyName}</div>
                      <div className="text-xs text-gray-400">{c.district}</div>
                    </td>
                    <td className="text-gray-600">{c.orders} ta</td>
                    <td className="font-semibold text-green-600">{formatCurrency(c.revenue)} so'm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Debt Aging */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="font-semibold text-gray-900">Qarz Muddati Tahlili (Aging)</span>
          </div>
          {aging && (
            <div className="space-y-4">
              {Object.entries(aging).map(([period, count]) => {
                const total = Object.values(aging).reduce((s: number, v) => s + (v as number), 0);
                const pct = total > 0 ? ((count as number) / total) * 100 : 0;
                const colors: Record<string, string> = {
                  "0-30 days": "bg-blue-400",
                  "31-60 days": "bg-amber-400",
                  "61-90 days": "bg-orange-400",
                  "90+ days": "bg-red-500",
                };
                return (
                  <div key={period}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-gray-600">{period}</span>
                      <span className="text-sm font-semibold text-gray-900">{count as number} ta mijoz</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className={`${colors[period] || "bg-gray-400"} h-3 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Jami qarzli mijozlar</span>
              <span className="font-bold text-red-600">{formatCurrency(summary.totalDebt)} so'm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
