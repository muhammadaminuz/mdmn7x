"use client";
import { useEffect, useRef, useState } from "react";
import { TrendingUp, Users, DollarSign, MapPin, ShoppingCart, Bell, ChevronRight, Camera, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { formatCurrency, formatCurrencyFull } from "@/lib/formatters";

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [agent, setAgent] = useState<any>(null);
  const [route, setRoute] = useState<any>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("agent_user");
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      setAgent(u.agent);
    }
    Promise.all([
      api.get("/dashboard/kpis"),
      api.get("/route-stops/today"),
    ]).then(([k, r]) => {
      setKpis(k.data);
      setRoute(r.data);
    }).finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Xayrli tong";
    if (h < 17) return "Xayrli kun";
    return "Xayrli oqshom";
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
    </div>
  );

  const performance = agent?.performance || 0;
  const visitCompletion = route ? Math.round((route.visited / Math.max(route.total, 1)) * 100) : 0;

  const stats = [
    { label: "Bugungi savdo", value: kpis ? formatCurrency(kpis.dailySales) + " so'm" : "—", icon: TrendingUp, color: "text-primary-600", bg: "bg-primary-50" },
    { label: "Buyurtmalar", value: kpis ? kpis.todayOrders + " ta" : "—", icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Tashriflar", value: route ? `${route.visited}/${route.total}` : "—", icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Inkassatsiya", value: kpis ? formatCurrency(kpis.collectionAmount) + " so'm" : "—", icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  function handleCheckIn(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) {
      setCheckedIn(true);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-500 px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-primary-100 text-sm">{greeting()},</p>
          <button className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
            <Bell className="w-4 h-4 text-white" />
          </button>
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">{agent?.fullName || user?.fullName || "Agent"}</h1>

        {/* Monthly target */}
        <div className="bg-white/15 backdrop-blur rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/80 text-sm font-medium">Oylik maqsad</span>
            <span className="text-white font-bold text-lg">{performance.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 mb-2">
            <div className="bg-white h-3 rounded-full transition-all" style={{ width: `${Math.min(performance, 100)}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-white/70">
            <span>{agent ? formatCurrencyFull(agent.currentSales) : "—"}</span>
            <span>/ {agent ? formatCurrencyFull(agent.monthlyTarget) : "—"}</span>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-2 space-y-4 pb-4">
        {/* Horizontally scrollable stat cards */}
        <div className="flex gap-3 overflow-x-auto pb-1 pt-4 -mx-4 px-4 scrollbar-none snap-x snap-mandatory">
          {stats.map((stat) => (
            <div key={stat.label} className="mobile-card p-4 flex-shrink-0 w-36 snap-start">
              <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="text-base font-bold text-gray-900 leading-tight">{stat.value}</div>
              <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Check-in card */}
        <div className={`mobile-card p-4 ${checkedIn ? "border-2 border-primary-400" : ""}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Kunni boshlash</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {checkedIn ? "✓ Muvaffaqiyatli belgilandi" : "Foto tekshiruv orqali kirish"}
              </p>
            </div>
            {checkedIn ? (
              <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center active:bg-primary-100 transition-colors"
              >
                <Camera className="w-6 h-6 text-primary-600" />
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCheckIn}
          />
        </div>

        {/* Route progress */}
        {route && (
          <div className="mobile-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-600" />
                <span className="font-semibold text-gray-900">Bugungi Marshrut</span>
              </div>
              <Link href="/route-plan" className="text-xs text-primary-600 font-medium flex items-center gap-0.5">
                Batafsil <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 bg-gray-100 rounded-full h-3">
                <div className="bg-primary-500 h-3 rounded-full transition-all" style={{ width: `${visitCompletion}%` }} />
              </div>
              <span className="text-sm font-bold text-gray-700 w-10 text-right">{visitCompletion}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{route.visited} ta tashrif bajarildi</span>
              <span className="text-amber-600 font-medium">{route.pending} ta qoldi</span>
            </div>

            {route.stops && route.stops.filter((s: any) => s.status === "PENDING").slice(0, 3).map((stop: any) => (
              <div key={stop.id} className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{stop.customerName}</div>
                  <div className="text-xs text-gray-400">{stop.address}</div>
                </div>
                <span className="text-xs text-gray-400">{stop.plannedTime.slice(11, 16)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: "/orders/new", label: "Buyurtma", icon: ShoppingCart, color: "bg-primary-500" },
            { href: "/collections", label: "Inkasso", icon: DollarSign, color: "bg-blue-500" },
            { href: "/customers", label: "Mijozlar", icon: Users, color: "bg-purple-500" },
          ].map((a) => (
            <Link key={a.href} href={a.href} className="mobile-card p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform">
              <div className={`w-11 h-11 ${a.color} rounded-2xl flex items-center justify-center`}>
                <a.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-700">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
