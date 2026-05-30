"use client";
import { useEffect, useState } from "react";
import { Search, Phone, MapPin, AlertCircle, ChevronRight } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { formatCurrencyFull } from "@/lib/formatters";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("agent_user") || "{}");
      const params: any = { limit: 50 };
      if (search) params.search = search;
      if (user.agent?.id) params.agentId = user.agent.id;
      const { data } = await api.get("/customers", { params });
      setCustomers(data.items);
      setTotal(data.total);
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900 mb-3">Mijozlarim ({total})</h1>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Nomi, telefon bo'yicha qidirish..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          {customers.map((c) => (
            <Link key={c.id} href={`/customers/${c.id}`} className="mobile-card p-4 block active:scale-98 transition-transform">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-700">
                    {c.companyName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{c.companyName}</h3>
                    <p className="text-xs text-gray-400">{c.ownerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${c.status === "ACTIVE" ? "bg-green-500" : c.status === "BLOCKED" ? "bg-red-500" : "bg-gray-400"}`} />
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.district}</span>
              </div>
              {c.debt > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-red-500 text-xs">
                    <AlertCircle className="w-3 h-3" />
                    <span className="font-medium">Qarzi bor</span>
                  </div>
                  <span className="text-xs font-bold text-red-600">{formatCurrencyFull(c.debt)}</span>
                </div>
              )}
              {c.balance > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-primary-600 font-medium">Balansi</span>
                  <span className="text-xs font-bold text-primary-600">{formatCurrencyFull(c.balance)}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
