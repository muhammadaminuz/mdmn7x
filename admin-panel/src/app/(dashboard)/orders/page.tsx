"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, Eye, CheckCircle, Printer, FileSpreadsheet } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, FilterChipGroup, DateRangePicker, PerPageSelect } from "@/components/ui/FilterBar";
import { Order } from "@/types";
import * as XLSX from "xlsx";

const statusOptions = [
  { value: "", label: "Barcha" },
  { value: "DRAFT", label: "Qoralama" },
  { value: "PENDING", label: "Kutilmoqda" },
  { value: "APPROVED", label: "Tasdiqlandi" },
  { value: "DELIVERED", label: "Yetkazildi" },
  { value: "CANCELLED", label: "Bekor" },
];

function todayStr() { return new Date().toISOString().slice(0, 10); }
function monthStartStr() { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); }

export default function OrdersPage() {
  const router = useRouter();
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
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());

  useEffect(() => { loadOrders(); }, [page, status, limit]);

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
    } finally { setLoading(false); }
  }

  function handleSearch(e: React.FormEvent) { e.preventDefault(); setPage(1); loadOrders(); }

  async function handleApprove(id: number) {
    setApprovingId(id);
    try {
      await api.put(`/orders/${id}/status`, { status: "APPROVED" });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "APPROVED" as any } : o));
    } finally { setApprovingId(null); }
  }

  function toggleSelect(id: number) {
    setSelectedOrders(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function toggleAll() {
    if (selectedOrders.size === orders.length) setSelectedOrders(new Set());
    else setSelectedOrders(new Set(orders.map(o => o.id)));
  }

  function exportNakladnaya() {
    const targetOrders = selectedOrders.size > 0
      ? orders.filter(o => selectedOrders.has(o.id))
      : orders;

    const wb = XLSX.utils.book_new();
    const now = new Date().toLocaleDateString("uz-UZ");
    const companyName = "FMCG Distribution";
    const companyDetails = "Toshkent sh. · Tel: +998 (90) 000-00-00 · STIR: 000000000";

    // ===== VARAQ 1: JAMI HISOBOT (summary, one row per order) =====
    const s1: any[][] = [];
    s1.push([`${companyName} — Buyurtmalar hisoboti`]);
    s1.push([`Davr: ${dateFrom} — ${dateTo}`, "", "", `Jami buyurtmalar: ${targetOrders.length} ta`]);
    s1.push([]);
    s1.push(["№", "Buyurtma №", "Sana", "Mijoz", "Agent", "Holat", "Mahsulot turi", "Chegirma (so'm)", "Jami summa (so'm)"]);

    let grandTotal = 0;
    let totalDiscount = 0;
    targetOrders.forEach((order, idx) => {
      const items = order.items || [];
      const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString("uz-UZ") : now;
      grandTotal += order.total || 0;
      totalDiscount += order.discount || 0;
      s1.push([
        idx + 1,
        order.orderNo,
        orderDate,
        order.customerName,
        order.agentName,
        order.status,
        items.length,
        order.discount || 0,
        order.total || 0,
      ]);
    });
    s1.push([]);
    s1.push(["", "", "", "", "", "", "JAMI:", totalDiscount, grandTotal]);

    const ws1 = XLSX.utils.aoa_to_sheet(s1);
    ws1["!cols"] = [{ wch: 4 }, { wch: 16 }, { wch: 12 }, { wch: 26 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 18 }];
    ws1["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "Hisobot");

    // ===== VARAQ 2: ALOHIDA НАКЛАДНАЯ (printable invoice per customer) =====
    const s2: any[][] = [];
    const merges: any[] = [];
    const COLS = 6; // 0..5

    const fullRow = (text: string) => { merges.push({ s: { r: s2.length, c: 0 }, e: { r: s2.length, c: COLS - 1 } }); s2.push([text]); };

    targetOrders.forEach((order, oi) => {
      const items = order.items || [];
      const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString("uz-UZ") : now;
      const subtotal = items.reduce((sum: number, it: any) => sum + (it.total || 0), 0);

      // Header box
      fullRow(`НАКЛАДНАЯ (Hisob-faktura) № ${order.orderNo}`);
      fullRow(`Sana: ${orderDate}`);
      s2.push([]);

      // Supplier / Receiver
      s2.push(["Yetkazib beruvchi (Topshiruvchi):", companyName, "", "Oluvchi (Qabul qiluvchi):", order.customerName, ""]);
      s2.push(["", companyDetails, "", "Agent:", order.agentName, ""]);
      s2.push([]);

      // Items table header
      s2.push(["№", "Mahsulot nomi", "Birlik", "Miqdor", "Narx (so'm)", "Summa (so'm)"]);
      items.forEach((item: any, i: number) => {
        s2.push([i + 1, item.productName, item.unit || "dona", item.quantity, item.price, item.total]);
      });

      // Totals
      s2.push(["", "", "", "", "Jami:", subtotal]);
      if (order.discount) s2.push(["", "", "", "", "Chegirma:", -order.discount]);
      s2.push(["", "", "", "", "TO'LOV SUMMASI:", order.total]);
      s2.push([]);

      // Signatures
      s2.push(["Topshirdi: ___________________", "", "", "Qabul qildi: ___________________", "", ""]);
      s2.push(["M.O.", "", "", "M.O.", "", ""]);
      s2.push([]);
      if (oi < targetOrders.length - 1) {
        fullRow("══════════════════════════════════════════════════════════════════");
        s2.push([]);
      }
    });

    const ws2 = XLSX.utils.aoa_to_sheet(s2);
    ws2["!cols"] = [{ wch: 6 }, { wch: 34 }, { wch: 8 }, { wch: 10 }, { wch: 16 }, { wch: 18 }];
    ws2["!merges"] = merges;
    XLSX.utils.book_append_sheet(wb, ws2, "Накладная");

    XLSX.writeFile(wb, `nakladnaya_${dateFrom}_${dateTo}.xlsx`);
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
        <button onClick={() => router.push("/orders/new")} className="btn-primary">
          <Plus className="w-4 h-4" />
          Yangi buyurtma
        </button>
      </div>

      {/* Filters */}
      <FilterBar>
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-48">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Buyurtma №, mijoz nomi..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <button type="submit" className="btn-secondary"><Filter className="w-4 h-4" />Filter</button>
        </form>
        <DateRangePicker from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        <FilterChipGroup options={statusOptions} value={status} onChange={v => { setStatus(v); setPage(1); }} />
        <div className="flex items-center gap-2 ml-auto">
          <PerPageSelect value={limit} onChange={v => { setLimit(v); setPage(1); }} />
          <button onClick={exportNakladnaya} className="btn-secondary flex items-center gap-1.5" title="Накладная Excel">
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            {selectedOrders.size > 0 ? `Накладная (${selectedOrders.size})` : "Накладная"}
          </button>
        </div>
      </FilterBar>

      {selectedOrders.size > 0 && (
        <div className="bg-brand-50 border border-brand-200 rounded-lg px-4 py-2 text-sm text-brand-700 flex items-center justify-between">
          <span>{selectedOrders.size} ta buyurtma tanlandi</span>
          <button onClick={() => setSelectedOrders(new Set())} className="text-brand-500 hover:underline text-xs">Bekor qilish</button>
        </div>
      )}

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
                  <th className="w-8">
                    <input type="checkbox" checked={selectedOrders.size === orders.length && orders.length > 0}
                      onChange={toggleAll} className="rounded border-gray-300" />
                  </th>
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
                {orders.map(order => (
                  <tr key={order.id} className={selectedOrders.has(order.id) ? "bg-brand-50/40" : ""}>
                    <td>
                      <input type="checkbox" checked={selectedOrders.has(order.id)}
                        onChange={() => toggleSelect(order.id)} className="rounded border-gray-300" />
                    </td>
                    <td className="font-semibold text-brand-600">{order.orderNo}</td>
                    <td><div className="font-medium text-gray-900">{order.customerName}</div></td>
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
                        <button onClick={() => { setSelectedOrders(new Set([order.id])); setTimeout(exportNakladnaya, 50); }}
                          className="p-1.5 hover:bg-green-50 rounded-lg transition-colors text-gray-400 hover:text-green-600" title="Накладная">
                          <Printer className="w-4 h-4" />
                        </button>
                        {order.status === "PENDING" && (
                          <button onClick={() => handleApprove(order.id)} disabled={approvingId === order.id}
                            className="p-1.5 hover:bg-green-50 rounded-lg transition-colors text-gray-400 hover:text-green-600 disabled:opacity-50" title="Tasdiqlash">
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
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="w-8 h-8 text-sm rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40">‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-8 h-8 text-sm rounded-lg transition-colors ${page === p ? "bg-brand-500 text-white" : "hover:bg-gray-100 text-gray-600"}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-8 h-8 text-sm rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40">›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
