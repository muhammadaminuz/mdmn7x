"use client";
import { useEffect, useState } from "react";
import { Plus, Search, Filter, Download, Eye, CheckCircle, Printer, FileSpreadsheet, FileText } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, FilterChipGroup, DateRangePicker, PerPageSelect } from "@/components/ui/FilterBar";
import { Order } from "@/types";

const statusOptions = [
  { value: "", label: "Barcha" },
  { value: "DRAFT", label: "Qoralama" },
  { value: "PENDING", label: "Kutilmoqda" },
  { value: "APPROVED", label: "Tasdiqlandi" },
  { value: "DELIVERED", label: "Yetkazildi" },
  { value: "CANCELLED", label: "Bekor" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartStr() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(monthStartStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  useEffect(() => {
    loadOrders();
  }, [page, status, limit]);

  async function loadOrders() {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (status) params.status = status;
      if (search) params.search = search;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
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

  async function handleApprove(id: number) {
    setApprovingId(id);
    try {
      await api.put(`/orders/${id}/status`, { status: "APPROVED" });
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "APPROVED" as any } : o));
    } finally {
      setApprovingId(null);
    }
  }

  function handleExportExcel() {
    const header = ["Buyurtma №", "Mijoz", "Agent", "Summa", "Holat", "Sana"];
    const rows = orders.map((o) => [o.orderNo, o.customerName, o.agentName, o.total, o.status, o.createdAt]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.ceil(total / limit);

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
      <FilterBar>
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
            Filter
          </button>
        </form>

        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onFromChange={setDateFrom}
          onToChange={setDateTo}
        />

        <FilterChipGroup
          options={statusOptions}
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
        />

        <div className="flex items-center gap-2 ml-auto">
          <PerPageSelect value={limit} onChange={(v) => { setLimit(v); setPage(1); }} />
          <div className="flex items-center gap-1">
            <button onClick={handleExportExcel} className="btn-secondary" title="Excel export">
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              Excel
            </button>
            <button className="btn-secondary" title="PDF export">
              <FileText className="w-4 h-4 text-red-500" />
              PDF
            </button>
          </div>
        </div>
      </FilterBar>

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
                  <th>Amal</th>
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
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600" title="Ko'rish">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600" title="Chop etish">
                          <Printer className="w-4 h-4" />
                        </button>
                        {order.status === "PENDING" && (
                          <button
                            onClick={() => handleApprove(order.id)}
                            disabled={approvingId === order.id}
                            className="p-1.5 hover:bg-green-50 rounded-lg transition-colors text-gray-400 hover:text-green-600 disabled:opacity-50"
                            title="Tasdiqlash"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
            {total === 0 ? "0" : `${(page - 1) * limit + 1}–${Math.min(page * limit, total)}`} / {total} ta
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 text-sm rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 text-sm rounded-lg transition-colors ${page === p ? "bg-brand-500 text-white" : "hover:bg-gray-100 text-gray-600"}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 text-sm rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
