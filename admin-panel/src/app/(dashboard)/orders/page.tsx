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
    const nowStr = new Date().toLocaleDateString("uz-UZ");
    const COMPANY = "FMCG Distribution MChJ";
    const COMPANY_ADDR = "Toshkent sh., Yunusobod tumani";
    const COMPANY_INN = "STIR: 123456789";
    const COMPANY_PHONE = "Tel: +998 90 000-00-00";

    const fmt = (n: number) => Number(n || 0).toLocaleString("uz-UZ");

    // ===== VARAQ 1: JAMI REESTR =====
    const s1: any[][] = [];
    s1.push([`${COMPANY}`]);
    s1.push([`BUYURTMALAR REESTRI`]);
    s1.push([`Davr: ${dateFrom} dan ${dateTo} gacha`, "", "", "", `Chop etilgan: ${nowStr}`]);
    s1.push([]);
    s1.push(["№", "Hisob-faktura №", "Sana", "Mijoz", "Agent", "Holat", "Mahsulotlar soni", "Chegirma (so'm)", "Jami summa (so'm)"]);

    let grandTotal = 0;
    let grandDiscount = 0;
    targetOrders.forEach((order, idx) => {
      const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString("uz-UZ") : nowStr;
      grandTotal += Number(order.total || 0);
      grandDiscount += Number(order.discount || 0);
      const statusMap: Record<string, string> = {
        DRAFT: "Qoralama", PENDING: "Kutilmoqda", APPROVED: "Tasdiqlandi",
        DELIVERED: "Yetkazildi", CANCELLED: "Bekor qilingan",
      };
      s1.push([
        idx + 1, order.orderNo, orderDate, order.customerName,
        order.agentName, statusMap[order.status] || order.status,
        (order.items || []).length, Number(order.discount || 0), Number(order.total || 0),
      ]);
    });
    s1.push([]);
    s1.push(["", "", "", "", "", "", "JAMI:", grandDiscount, grandTotal]);

    const ws1 = XLSX.utils.aoa_to_sheet(s1);
    ws1["!cols"] = [
      { wch: 4 }, { wch: 18 }, { wch: 12 }, { wch: 28 }, { wch: 20 },
      { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 20 },
    ];
    ws1["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "Reestr");

    // ===== VARAQ 2: TOVAR HISOB-FAKTURA (har bir buyurtma uchun alohida) =====
    const s2: any[][] = [];
    const merges2: any[] = [];
    const C = 7; // columns 0..6: №, Nomi, Birlik, Miqdor, Narx, Summa, (empty)

    const merge = (text: string | number, fromC = 0, toC = C - 1) => {
      if (fromC < toC) merges2.push({ s: { r: s2.length, c: fromC }, e: { r: s2.length, c: toC } });
      const row = Array(C).fill("");
      row[fromC] = text;
      s2.push(row);
    };

    targetOrders.forEach((order, oi) => {
      const items = order.items || [];
      const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString("uz-UZ") : nowStr;
      const subtotal = items.reduce((sum: number, it: any) => sum + Number(it.total || 0), 0);

      // ── Title ──
      s2.push(Array(C).fill(""));
      merge(`TOVAR HISOB-FAKTURASI`);
      merge(`№ ${order.orderNo}   Sana: ${orderDate}`);
      s2.push(Array(C).fill(""));

      // ── Sender / Receiver block ──
      const r1 = Array(C).fill("");
      r1[0] = "Yetkazib beruvchi:"; r1[1] = COMPANY; r1[4] = "Sotib oluvchi:"; r1[5] = order.customerName;
      s2.push(r1);
      const r2 = Array(C).fill("");
      r2[1] = COMPANY_ADDR; r2[5] = `Agent: ${order.agentName}`;
      s2.push(r2);
      const r3 = Array(C).fill("");
      r3[1] = `${COMPANY_INN}  ${COMPANY_PHONE}`;
      s2.push(r3);
      s2.push(Array(C).fill(""));

      // ── Table header ──
      s2.push(["№", "Tovar nomi", "O'lchov birligi", "Miqdori", "Narxi (so'm)", "Summasi (so'm)", ""]);

      // ── Items ──
      items.forEach((item: any, i: number) => {
        s2.push([i + 1, item.productName, "dona", item.quantity, item.price, item.total, ""]);
      });

      // ── Totals ──
      s2.push(Array(C).fill(""));
      const tRow = Array(C).fill("");
      tRow[3] = "Jami miqdor:"; tRow[4] = `${items.reduce((s: number, it: any) => s + (it.quantity || 0), 0)} dona`;
      s2.push(tRow);

      const totRow1 = Array(C).fill(""); totRow1[4] = "Jami:"; totRow1[5] = subtotal; s2.push(totRow1);
      if (Number(order.discount || 0) > 0) {
        const discRow = Array(C).fill(""); discRow[4] = "Chegirma:"; discRow[5] = -Number(order.discount); s2.push(discRow);
      }
      const payRow = Array(C).fill(""); payRow[4] = "TO'LOV SUMMASI:"; payRow[5] = order.total; s2.push(payRow);

      // Total in text
      merge(`Jami so'mda: ${fmt(Number(order.total || 0))} so'm`, 0, C - 1);
      s2.push(Array(C).fill(""));

      // ── Signatures ──
      merge("", 0, C - 1);
      const sig1 = Array(C).fill("");
      sig1[0] = "Tovarni topshirdi:"; sig1[1] = "______________________"; sig1[1 + 1] = "";
      sig1[4] = "Tovarni qabul qildi:"; sig1[5] = "______________________";
      s2.push(sig1);
      const sig2 = Array(C).fill("");
      sig2[0] = "Lavozimi: ____________"; sig2[4] = "Lavozimi: ____________";
      s2.push(sig2);
      const sig3 = Array(C).fill("");
      sig3[0] = "F.I.SH.:  ____________"; sig3[4] = "F.I.SH.:  ____________";
      s2.push(sig3);
      const sig4 = Array(C).fill("");
      sig4[0] = "M.O."; sig4[4] = "M.O.";
      s2.push(sig4);
      s2.push(Array(C).fill(""));

      if (oi < targetOrders.length - 1) {
        merge("─".repeat(80));
        s2.push(Array(C).fill(""));
      }
    });

    const ws2 = XLSX.utils.aoa_to_sheet(s2);
    ws2["!cols"] = [
      { wch: 4 }, { wch: 32 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 2 },
    ];
    ws2["!merges"] = merges2;
    XLSX.utils.book_append_sheet(wb, ws2, "Hisob-faktura");

    XLSX.writeFile(wb, `hisob_faktura_${dateFrom}_${dateTo}.xlsx`);
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
