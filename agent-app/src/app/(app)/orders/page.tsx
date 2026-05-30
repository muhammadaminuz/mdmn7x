"use client";
import { useEffect, useState } from "react";
import { Plus, ShoppingCart, ChevronRight } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { formatCurrencyFull, formatDate } from "@/lib/formatters";

const statusColors: Record<string, string> = {
  DELIVERED: "bg-green-100 text-green-700",
  APPROVED: "bg-blue-100 text-blue-700",
  PENDING: "bg-amber-100 text-amber-700",
  DRAFT: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-600",
};
const statusLabels: Record<string, string> = {
  DELIVERED: "Yetkazildi", APPROVED: "Tasdiqlandi",
  PENDING: "Kutilmoqda", DRAFT: "Qoralama", CANCELLED: "Bekor qilindi",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [filter]);

  async function load() {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("agent_user") || "{}");
      const params: any = { limit: 30 };
      if (filter) params.status = filter;
      if (user.agent?.id) params.agentId = user.agent.id;
      const { data } = await api.get("/orders", { params });
      setOrders(data.items);
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Buyurtmalarim</h1>
          <Link href="/orders/new" className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center shadow-md">
            <Plus className="w-5 h-5 text-white" />
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {["", "PENDING", "APPROVED", "DELIVERED", "CANCELLED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${filter === s ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-500"}`}
            >
              {s === "" ? "Barchasi" : statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <ShoppingCart className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">Buyurtmalar yo'q</p>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="mobile-card p-4 flex items-center justify-between active:scale-98 transition-transform">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{o.orderNo}</p>
                  <p className="text-xs text-gray-500">{o.customerName}</p>
                  <p className="text-xs text-gray-400">{formatDate(o.createdAt)}</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <p className="text-sm font-bold text-gray-900">{formatCurrencyFull(o.total)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[o.status]}`}>
                  {statusLabels[o.status]}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
