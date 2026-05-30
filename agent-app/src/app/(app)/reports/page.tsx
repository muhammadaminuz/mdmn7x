"use client";
import { useEffect, useState } from "react";
import { TrendingUp, ShoppingCart, Users, DollarSign } from "lucide-react";
import api from "@/lib/api";
import { formatCurrencyFull } from "@/lib/formatters";

function formatPercent(v: number) { return `${v.toFixed(1)}%`; }

export default function ReportsPage() {
  const [agent, setAgent] = useState<any>(null);
  const [agentReport, setAgentReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("agent_user") || "{}");
    setAgent(user.agent);
    if (user.agent?.id) {
      api.get(`/agents/${user.agent.id}`).then((r) => {
        setAgentReport(r.data);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;

  const stats = agent ? [
    { label: "Oylik sotuv", value: formatCurrencyFull(agent.currentSales), icon: DollarSign, color: "text-primary-600", bg: "bg-primary-50" },
    { label: "Oylik maqsad", value: formatCurrencyFull(agent.monthlyTarget), icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Samaradorlik", value: formatPercent(agent.performance), icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Mijozlar", value: agent.customersCount + " ta", icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Mening Hisobotim</h1>
        <p className="text-sm text-gray-400 mt-0.5">{agent?.territoryName} hududi</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Performance card */}
        {agent && (
          <div className="mobile-card p-5 bg-primary-500 text-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-primary-100 text-sm">Oylik maqsad bajarilishi</span>
              <span className="text-2xl font-bold">{formatPercent(agent.performance)}</span>
            </div>
            <div className="w-full bg-white/30 rounded-full h-4 mb-2">
              <div className="bg-white h-4 rounded-full" style={{ width: `${Math.min(agent.performance, 100)}%` }} />
            </div>
            <div className="flex justify-between text-primary-100 text-xs">
              <span>{formatCurrencyFull(agent.currentSales)}</span>
              <span>{formatCurrencyFull(agent.monthlyTarget)}</span>
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="mobile-card p-4">
              <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Today's route stats */}
        {agentReport && (
          <div className="mobile-card p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Bugungi faoliyat</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Tashrif", value: agentReport.visitedToday + "/" + agentReport.totalStops },
                { label: "Buyurtma", value: agentReport.recentOrders?.length || 0 },
                { label: "Hudud", value: agent?.territoryName?.slice(0, 8) || "—" },
              ].map((s) => (
                <div key={s.label} className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-lg font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
