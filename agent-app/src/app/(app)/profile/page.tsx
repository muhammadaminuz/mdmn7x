"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Mail, MapPin, LogOut, ChevronRight, Shield } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [agent, setAgent] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("agent_user");
    if (stored) { const u = JSON.parse(stored); setUser(u); setAgent(u.agent); }
  }, []);

  function logout() {
    localStorage.removeItem("agent_token");
    localStorage.removeItem("agent_user");
    router.replace("/login");
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile header */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-500 px-4 pt-12 pb-8 text-center">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold text-white mx-auto mb-3">
          {user.fullName?.charAt(0) || "A"}
        </div>
        <h1 className="text-xl font-bold text-white">{user.fullName}</h1>
        <p className="text-primary-100 text-sm mt-0.5">
          {user.role === "SALES_AGENT" ? "Savdo Agenti" : user.role === "SALES_MANAGER" ? "Savdo Menejeri" : user.role}
        </p>
        {agent && <p className="text-primary-200 text-xs mt-1">{agent.territoryName} hududi</p>}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Contact */}
        <div className="mobile-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">Aloqa</div>
          {[
            { icon: Phone, label: "Telefon", value: agent?.phone || user.phone || "—" },
            { icon: Mail, label: "Email", value: user.email },
            { icon: MapPin, label: "Hudud", value: agent?.territoryName || "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="px-4 py-3 flex items-center gap-3 border-b border-gray-50 last:border-0">
              <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm font-medium text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Performance */}
        {agent && (
          <div className="mobile-card p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Oylik Ko'rsatkichlar</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Samaradorlik</span>
              <span className="text-sm font-bold text-primary-600">{agent.performance.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 mb-4">
              <div className="bg-primary-500 h-3 rounded-full" style={{ width: `${Math.min(agent.performance, 100)}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-xl text-center">
                <p className="text-base font-bold text-gray-900">{agent.customersCount}</p>
                <p className="text-xs text-gray-400">Mijozlar</p>
              </div>
              <div className="p-3 bg-primary-50 rounded-xl text-center">
                <p className="text-base font-bold text-primary-600">{agent.performance.toFixed(0)}%</p>
                <p className="text-xs text-gray-400">Maqsad</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mobile-card overflow-hidden">
          {[
            { icon: Shield, label: "Parolni o'zgartirish", color: "text-gray-600" },
          ].map(({ icon: Icon, label, color }) => (
            <button key={label} className="w-full px-4 py-3 flex items-center gap-3 border-b border-gray-50 last:border-0">
              <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
                <Icon className="w-4 h-4 text-gray-400" />
              </div>
              <span className={`flex-1 text-sm font-medium text-left ${color}`}>{label}</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          ))}
        </div>

        <button onClick={logout} className="w-full mobile-card p-4 flex items-center gap-3 active:scale-98 transition-transform">
          <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <LogOut className="w-5 h-5 text-red-500" />
          </div>
          <span className="font-semibold text-red-600">Hisobdan chiqish</span>
        </button>
      </div>
    </div>
  );
}
