"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Package2 } from "lucide-react";
import api from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("agent@demo.com");
  const [password, setPassword] = useState("demo123");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (!["SALES_AGENT", "SUPER_ADMIN", "SALES_MANAGER", "SUPERVISOR"].includes(data.user.role)) {
        setError("Bu ilova faqat savdo agentlari uchun");
        return;
      }
      localStorage.setItem("agent_token", data.token);
      localStorage.setItem("agent_user", JSON.stringify(data.user));
      router.replace("/home");
    } catch {
      setError("Email yoki parol noto'g'ri");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container bg-white min-h-screen flex flex-col">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-500 px-6 pt-16 pb-12 flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-4">
          <Package2 className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Agent App</h1>
        <p className="text-primary-100 text-sm">DistributionERP savdo tizimi</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-5 pt-8 pb-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl px-4 py-3 text-sm mb-5 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors"
              placeholder="email@example.com" required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Parol</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-base pr-12 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors"
                required
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={loading} className="green-btn disabled:opacity-60">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {loading ? "Kirish..." : "Kirish"}
            </button>
          </div>
        </form>

        <div className="mt-8 p-4 bg-gray-50 rounded-2xl">
          <p className="text-xs font-semibold text-gray-500 mb-3 text-center">DEMO MA'LUMOTLAR</p>
          <button
            onClick={() => { setEmail("agent@demo.com"); setPassword("demo123"); }}
            className="w-full text-left p-3 bg-white rounded-xl border border-gray-200 active:bg-gray-50"
          >
            <div className="text-sm font-semibold text-primary-600">Savdo Agent</div>
            <div className="text-xs text-gray-400">agent@demo.com / demo123</div>
          </button>
        </div>
      </div>
    </div>
  );
}
