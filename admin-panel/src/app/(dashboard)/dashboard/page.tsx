"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  TrendingUp, TrendingDown, DollarSign, Users, UserCheck,
  Package, Map, ShoppingCart, AlertCircle, ArrowUpRight, Clock,
  Trophy, Medal
} from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDate, timeAgo } from "@/lib/formatters";
import { Badge } from "@/components/ui/Badge";
import { KpiData, Order } from "@/types";

const SalesChart = dynamic(() => import("@/components/dashboard/SalesChart"), { ssr: false });
const OrderStatusChart = dynamic(() => import("@/components/dashboard/OrderStatusChart"), { ssr: false });
const AgentPerformanceChart = dynamic(() => import("@/components/dashboard/AgentPerformanceChart"), { ssr: false });
const WeeklyOrdersChart = dynamic(() => import("@/components/dashboard/WeeklyOrdersChart"), { ssr: false });

const periodTabs = [
  { label: "Bugun", value: "today" },
  { label: "Bu hafta", value: "week" },
  { label: "Bu oy", value: "month" },
  { label: "Yil", value: "year" },
];

const rankStyles = [
  { bg: "bg-amber-400", text: "text-amber-900", icon: Trophy },
  { bg: "bg-gray-300", text: "text-gray-700", icon: Medal },
  { bg: "bg-orange-400", text: "text-orange-900", icon: Medal },
];

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [charts, setCharts] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    async function loadData() {
      try {
        const [kpisRes, chartsRes, ordersRes] = await Promise.all([
          api.get("/dashboard/kpis"),
          api.get("/dashboard/charts"),
          api.get("/dashboard/recent-orders"),
        ]);
        setKpis(kpisRes.data);
        setCharts(chartsRes.data);
        setRecentOrders(ordersRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [period]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
    </div>
  );

  const kpiCards = kpis ? [
    {
      label: "Bugungi Savdo",
      value: formatCurrency(kpis.dailySales),
      subValue: "so'm",
      icon: DollarSign,
      color: "text-brand-600",
      bg: "bg-brand-50",
      trend: "+12.5%",
      trendUp: true,
    },
    {
      label: "Oylik Daromad",
      value: formatCurrency(kpis.monthlyRevenue),
      subValue: "so'm",
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50",
      trend: "+8.3%",
      trendUp: true,
    },
    {
      label: "Inkassatsiya",
      value: formatCurrency(kpis.collectionAmount),
      subValue: "so'm",
      icon: DollarSign,
      color: "text-purple-600",
      bg: "bg-purple-50",
      trend: "+5.1%",
      trendUp: true,
    },
    {
      label: "Umumiy Qarz",
      value: formatCurrency(kpis.debtAmount),
      subValue: "so'm",
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      trend: "-3.2%",
      trendUp: false,
    },
    {
      label: "Faol Agentlar",
      value: String(kpis.activeAgents),
      subValue: "agent",
      icon: UserCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      trend: "6/7",
      trendUp: true,
    },
    {
      label: "Faol Mijozlar",
      value: String(kpis.activeCustomers),
      subValue: `/ ${kpis.totalCustomers} ta`,
      icon: Users,
      color: "text-amber-600",
      bg: "bg-amber-50",
      trend: "+3",
      trendUp: true,
    },
    {
      label: "Ombor Qoldig'i",
      value: kpis.warehouseStock.toLocaleString(),
      subValue: "birlik",
      icon: Package,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      trend: "3 ombor",
      trendUp: true,
    },
    {
      label: "Marshrut Bajarilishi",
      value: `${kpis.routeCompletion}%`,
      subValue: "bugun",
      icon: Map,
      color: "text-teal-600",
      bg: "bg-teal-50",
      trend: kpis.todayOrders + " buyurtma",
      trendUp: true,
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Period filter tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">{formatDate(new Date().toISOString())} holatiga ko'ra</p>
        </div>
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
          {periodTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setPeriod(tab.value)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                period === tab.value
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="kpi-card">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <span className={`text-xs font-medium flex items-center gap-0.5 ${card.trendUp ? "text-green-600" : "text-red-500"}`}>
                {card.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {card.trend}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{card.label} · <span className="text-gray-400">{card.subValue}</span></div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Oylik Savdo Trendi</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">12 oy</span>
          </div>
          {charts && <SalesChart data={charts.monthlySales} />}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Buyurtma Holatlari</h3>
          </div>
          {charts && <OrderStatusChart data={charts.orderStatusDistribution} />}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Agent Samaradorligi</h3>
          </div>
          {charts && <AgentPerformanceChart data={charts.agentPerformance} />}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Haftalik Buyurtmalar</h3>
          </div>
          {charts && <WeeklyOrdersChart data={charts.weeklyOrders} />}
        </div>
      </div>

      {/* Recent Orders + Top Agents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">So'nggi Buyurtmalar</h3>
            <a href="/orders" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              Barchasi <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Buyurtma №</th>
                  <th>Mijoz</th>
                  <th>Agent</th>
                  <th>Summa</th>
                  <th>Holat</th>
                  <th>Vaqt</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="font-medium text-brand-600">{order.orderNo}</td>
                    <td className="text-gray-700">{order.customerName}</td>
                    <td className="text-gray-500">{order.agentName}</td>
                    <td className="font-semibold">{formatCurrency(order.total)}</td>
                    <td><Badge status={order.status} /></td>
                    <td className="text-gray-400 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Agents leaderboard */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Top Agentlar</h3>
            <a href="/agents" className="text-xs text-brand-600 hover:underline">Ko'proq</a>
          </div>
          <div className="p-4 space-y-3">
            {charts?.agentPerformance?.map((agent: any, i: number) => {
              const rank = rankStyles[i] || { bg: "bg-gray-100", text: "text-gray-600", icon: null };
              const RankIcon = rank.icon;
              return (
                <div key={agent.agentName} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${rank.bg}`}>
                    {i < 3 && RankIcon ? (
                      <RankIcon className={`w-3.5 h-3.5 ${rank.text}`} />
                    ) : (
                      <span className={`text-xs font-bold ${rank.text}`}>{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="text-sm font-medium text-gray-900 truncate">{agent.agentName}</div>
                      <span className={`text-xs font-bold ml-2 flex-shrink-0 ${agent.performance >= 90 ? "text-green-600" : agent.performance >= 75 ? "text-blue-600" : "text-amber-600"}`}>
                        {agent.performance}%
                      </span>
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${agent.performance >= 90 ? "bg-green-500" : agent.performance >= 75 ? "bg-blue-500" : "bg-amber-400"}`}
                        style={{ width: `${agent.performance}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
