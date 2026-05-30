"use client";
import { useEffect, useState } from "react";
import { UserCheck, Phone, MapPin, Users, Clock } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, timeAgo } from "@/lib/formatters";
import { Agent } from "@/types";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/agents").then((r) => { setAgents(r.data); setLoading(false); });
    const interval = setInterval(() => {
      api.get("/agents").then((r) => setAgents(r.data));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>;

  const activeAgents = agents.filter((a) => a.isActive);
  const avgPerf = activeAgents.length
    ? activeAgents.reduce((s, a) => s + a.performance, 0) / activeAgents.length
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Agentlar</h2>
          <p className="text-sm text-gray-500 mt-0.5">{activeAgents.length} faol / {agents.length} jami</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Jonli ma'lumot
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Faol Agentlar", value: activeAgents.length, color: "text-green-600", bg: "bg-green-50" },
          { label: "O'rtacha Samaradorlik", value: `${avgPerf.toFixed(1)}%`, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Jami Mijozlar", value: agents.reduce((s, a) => s + a.customersCount, 0), color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Jami Sotuv", value: `${(agents.reduce((s, a) => s + a.currentSales, 0) / 1_000_000).toFixed(0)}M so'm`, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((s) => (
          <div key={s.label} className="kpi-card">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow ${!agent.isActive ? "opacity-60 border-gray-100" : "border-gray-100"}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-lg">
                    {agent.fullName.charAt(0)}
                  </div>
                  {agent.isActive && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full animate-pulse" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{agent.fullName}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{agent.territoryName}
                  </div>
                </div>
              </div>
              <span className={`status-badge ${agent.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {agent.isActive ? "Faol" : "Nofaol"}
              </span>
            </div>

            {/* Performance bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Oylik maqsad bajarilishi</span>
                <span className={`text-xs font-semibold ${agent.performance >= 90 ? "text-green-600" : agent.performance >= 75 ? "text-blue-600" : "text-amber-600"}`}>
                  {agent.performance.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${agent.performance >= 90 ? "bg-green-500" : agent.performance >= 75 ? "bg-blue-500" : "bg-amber-500"}`}
                  style={{ width: `${Math.min(agent.performance, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                <span>{formatCurrency(agent.currentSales)} so'm</span>
                <span>/ {formatCurrency(agent.monthlyTarget)} so'm</span>
              </div>
            </div>

            {/* Visit progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Bugungi tashriflar</span>
                <span className="text-xs text-gray-500">
                  {agent.visitedToday ?? "—"} / {agent.totalStops ?? "—"}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-teal-400 transition-all duration-500"
                  style={{ width: `${agent.totalStops ? Math.round(((agent.visitedToday ?? 0) / agent.totalStops) * 100) : 0}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <Phone className="w-3.5 h-3.5" />
                <span className="text-xs">{agent.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <Users className="w-3.5 h-3.5" />
                <span className="text-xs">{agent.customersCount} mijoz</span>
              </div>
            </div>

            {agent.lastSeen && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> So'nggi ko'rinish</span>
                <span className={agent.isActive ? "text-green-600 font-medium" : ""}>{timeAgo(agent.lastSeen)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
