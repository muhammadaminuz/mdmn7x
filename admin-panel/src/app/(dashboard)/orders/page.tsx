"use client";
import { useEffect, useState } from "react";
import { Plus, Search, Filter, Download, Eye } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { Badge } from "@/components/ui/Badge";
import { Order } from "@/types";

const statusOptions = ["", "DRAFT", "PENDING", "APPROVED", "DELIVERED", "CANCELLED"];
const statusLabels: Record<string, string> = {
  "": "Barcha holat",
  DRAFT: "Qoralama",
  PENDING: "Kutilmoqda",
  APPROVED: "Tasdiqlandi",
  DELIVERED: "Yetkazildi",
  CANCELLED: "Bekor qilindi",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [page, status]);

  async function loadOrders() {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (status) params.status = status;
      if (search) params.search = search;
      const { data } = await api.get("/orders", { params });
      setOrders(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadOrders();
  }

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Buyurtmalar</h2>
          <p className="text-sm text-gray-500 mt-0.5">Jami {total} ta buyurtma</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-4 h-4" />
          Yangi buyurtma
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-48">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buyurtma №, mijoz nomi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button type="submit" className="btn-secondary">
            <Filter className="w-4 h-4" />
            Qidirish
          </button>
        </form>

        <div className="flex items-center gap-2">
          {statusOptions.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${status === s ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>

        <button className="btn-secondary ml-auto">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Buyurtma №</th>
                  <th>Mijoz</th>
                  <th>Agent</th>
                  <th>Mahsulotlar</th>
                  <th>Jami summa</th>
                  <th>Holat</th>
                  <th>Sana</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="font-semibold text-brand-600">{order.orderNo}</td>
                    <td>
                      <div className="font-medium text-gray-900">{order.customerName}</div>
                    </td>
                    <td className="text-gray-600">{order.agentName}</td>
                    <td className="text-gray-500">{order.items.length} ta</td>
                    <td className="font-semibold text-gray-900">{formatCurrency(order.total)} so'm</td>
                    <td><Badge status={order.status} /></td>
                    <td className="text-gray-500 text-xs">{formatDateTime(order.createdAt)}</td>
                    <td>
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">
            {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} / {total} ta
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 text-sm rounded-lg transition-colors ${page === p ? "bg-brand-500 text-white" : "hover:bg-gray-100 text-gray-600"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
