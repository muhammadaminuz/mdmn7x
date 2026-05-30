"use client";
import { useEffect, useState } from "react";
import { Plus, Search, Phone, MapPin, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/Badge";
import { Customer } from "@/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCustomers(); }, [page, status]);

  async function loadCustomers() {
    setLoading(true);
    try {
      const params: any = { page, limit: 12 };
      if (status) params.status = status;
      if (search) params.search = search;
      const { data } = await api.get("/customers", { params });
      setCustomers(data.items);
      setTotal(data.total);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Mijozlar</h2>
          <p className="text-sm text-gray-500 mt-0.5">Jami {total} ta mijoz</p>
        </div>
        <button className="btn-primary"><Plus className="w-4 h-4" />Yangi mijoz</button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Nomi, telefon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadCustomers()}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        {["", "ACTIVE", "INACTIVE", "BLOCKED"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${status === s ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {s === "" ? "Barchasi" : s === "ACTIVE" ? "Faol" : s === "INACTIVE" ? "Nofaol" : "Bloklangan"}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{c.companyName}</h3>
                  <p className="text-sm text-gray-500">{c.ownerName}</p>
                </div>
                <Badge status={c.status} />
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{c.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{c.district}</span>
                </div>
              </div>
              {c.debt > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Qarz</span>
                  </div>
                  <span className="text-sm font-bold text-red-600">{formatCurrency(c.debt)} so'm</span>
                </div>
              )}
              {c.balance > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-green-600">Balans</span>
                  <span className="text-sm font-bold text-green-600">{formatCurrency(c.balance)} so'm</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3">
        <span className="text-sm text-gray-500">{(page - 1) * 12 + 1}–{Math.min(page * 12, total)} / {total}</span>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(Math.ceil(total / 12), 5) }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 text-sm rounded-lg ${page === p ? "bg-brand-500 text-white" : "hover:bg-gray-100 text-gray-600"}`}>{p}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
