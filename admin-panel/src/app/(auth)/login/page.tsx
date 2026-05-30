"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Eye, EyeOff, Package2, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("admin123");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("erp_token", data.token);
      localStorage.setItem("erp_user", JSON.stringify(data.user));
      router.replace("/dashboard");
    } catch {
      setError("Email yoki parol noto'g'ri");
    } finally {
      setLoading(false);
    }
  }

  const demoUsers = [
    { label: "Super Admin", email: "admin@demo.com", password: "admin123" },
    { label: "Director", email: "director@demo.com", password: "demo123" },
    { label: "Sales Manager", email: "salesmanager@demo.com", password: "demo123" },
    { label: "Accountant", email: "accountant@demo.com", password: "demo123" },
  ];

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-slate-800 to-brand-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
            <Package2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">DistributionERP</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            FMCG Distribution<br />Management System
          </h1>
          <p className="text-slate-400 text-lg mb-8">
            Enterprise-grade ERP for FMCG distribution companies. Manage agents, orders, inventory, and analytics in one platform.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Active Agents", value: "6" },
              { label: "Monthly Orders", value: "445" },
              { label: "Customers", value: "35" },
              { label: "Revenue", value: "401M so'm" },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-700/50 rounded-xl p-4">
                <div className="text-2xl font-bold text-brand-400">{stat.value}</div>
                <div className="text-slate-400 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-slate-500 text-sm">© 2025 DistributionERP. All rights reserved.</div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
              <Package2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">DistributionERP</span>
          </div>

          <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-2">Kirish</h2>
            <p className="text-slate-400 text-sm mb-6">Tizimga kirish uchun ma'lumotlaringizni kiriting</p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder-slate-500"
                  placeholder="admin@demo.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Parol</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    required
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? "Kirish..." : "Kirish"}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-xs text-slate-500 mb-3">Demo foydalanuvchilar:</p>
              <div className="grid grid-cols-2 gap-2">
                {demoUsers.map((u) => (
                  <button
                    key={u.label}
                    onClick={() => { setEmail(u.email); setPassword(u.password); }}
                    className="text-left px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    <div className="text-xs font-medium text-brand-400">{u.label}</div>
                    <div className="text-xs text-slate-400 truncate">{u.email}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
