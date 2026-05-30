"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const BarChartWidget = dynamic(() => import("@/components/charts/BarChartWidget"), { ssr: false });
const DonutChartWidget = dynamic(() => import("@/components/charts/DonutChartWidget"), { ssr: false });
const LineChartWidget = dynamic(() => import("@/components/charts/LineChartWidget"), { ssr: false });

import api from "@/lib/api";
import { formatCurrency } from "@/lib/formatters";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/analytics/overview").then((r) => { setData(r.data); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Analitika</h2>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Eng yuqori oy", value: "Dekabr 2024", sub: "389M so'm", color: "text-brand-600" },
          { label: "O'rtacha oylik", value: `${(data.monthlySales.reduce((s: number, m: any) => s + m.revenue, 0) / data.monthlySales.length / 1_000_000).toFixed(0)}M so'm`, sub: "so'nggi 12 oy", color: "text-blue-600" },
          { label: "Eng faol hudud", value: "Chilonzor", sub: "125M so'm", color: "text-purple-600" },
          { label: "Top agent", value: "Sanjar Y.", sub: "94.8% samaradorlik", color: "text-amber-600" },
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Kategoriya bo'yicha Daromad</h3>
          <DonutChartWidget
            data={data.categoryRevenue.filter((c: any) => c.revenue > 0).map((c: any) => ({ name: c.category, value: c.revenue }))}
          />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Hudud bo'yicha Sotuv</h3>
          <BarChartWidget
            data={data.territoryRevenue.map((t: any) => ({ name: t.territory, value: Math.round(t.revenue / 1_000_000) }))}
            label="Daromad (M so'm)"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Oylik Daromad Trendi</h3>
        <LineChartWidget
          data={data.monthlySales.map((m: any) => ({ name: m.month, value: Math.round(m.revenue / 1_000_000) }))}
          label="Daromad (M so'm)"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">Kategoriya Tahlili</div>
        <table className="w-full data-table">
          <thead><tr><th>Kategoriya</th><th>Daromad</th><th>Ulushi</th><th>Grafik</th></tr></thead>
          <tbody>
            {data.categoryRevenue.filter((c: any) => c.revenue > 0).map((c: any) => (
              <tr key={c.category}>
                <td className="font-medium text-gray-900">{c.category}</td>
                <td className="font-semibold text-green-600">{formatCurrency(c.revenue)} so'm</td>
                <td><span className="text-sm font-medium text-gray-700">{c.percentage}%</span></td>
                <td>
                  <div className="w-32 bg-gray-100 rounded-full h-2">
                    <div className="bg-brand-500 h-2 rounded-full" style={{ width: `${c.percentage}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
