"use client";
import { useEffect, useState } from "react";
import { MapPin, Users, TrendingUp, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/formatters";
import { Territory } from "@/types";

export default function TerritoriesPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/territories").then((r) => { setTerritories(r.data); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>;

  const totalSales = territories.reduce((s, t) => s + t.totalSales, 0);
  const totalDebt = territories.reduce((s, t) => s + t.totalDebt, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Hududlar</h2>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Jami Hududlar", value: territories.length, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Jami Sotuv", value: `${(totalSales / 1_000_000).toFixed(0)}M so'm`, color: "text-green-600", bg: "bg-green-50" },
          { label: "Jami Qarz", value: `${(totalDebt / 1_000_000).toFixed(1)}M so'm`, color: "text-red-600", bg: "bg-red-50" },
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full data-table">
          <thead>
            <tr>
              <th>Hudud nomi</th>
              <th>Viloyat</th>
              <th>Agent</th>
              <th>Mijozlar</th>
              <th>Jami sotuv</th>
              <th>Qarz</th>
              <th>Sotuv ulushi</th>
            </tr>
          </thead>
          <tbody>
            {territories.map((t) => {
              const pct = totalSales > 0 ? (t.totalSales / totalSales) * 100 : 0;
              return (
                <tr key={t.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-brand-600" />
                      </div>
                      <span className="font-medium text-gray-900">{t.name}</span>
                    </div>
                  </td>
                  <td className="text-gray-500">{t.region}</td>
                  <td className="text-gray-700">{t.agentName || "-"}</td>
                  <td>
                    <div className="flex items-center gap-1 text-gray-700">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      {t.customersCount}
                    </div>
                  </td>
                  <td className="font-semibold text-gray-900">{formatCurrency(t.totalSales)} so'm</td>
                  <td>
                    <div className="flex items-center gap-1 text-red-600">
                      {t.totalDebt > 5_000_000 && <AlertCircle className="w-3.5 h-3.5" />}
                      <span className="font-medium">{formatCurrency(t.totalDebt)} so'm</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div className="bg-brand-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
