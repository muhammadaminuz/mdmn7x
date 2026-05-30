"use client";
import { useEffect, useState } from "react";
import { Plus, Search, Filter, Eye, CheckCircle, Printer, FileSpreadsheet, FileText, X, Trash2 } from "lucide-react";
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

interface OrderItem { productId: number; productName: string; quantity: number; price: number; total: number; unit?: string; }
interface NewOrderForm { customerId: number; agentId: number; discount: number; note: string; items: OrderItem[]; }

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
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [form, setForm] = useState<NewOrderForm>({ customerId: 0, agentId: 0, discount: 0, note: "", items: [] });

  useEffect(() => { loadOrders(); }, [page, status, limit]);

  useEffect(() => {
    if (showModal) {
      api.get("/customers", { params: { limit: 100 } }).then(r => setCustomers(r.data.items || r.data));
      api.get("/agents", { params: { limit: 100 } }).then(r => setAgents(r.data.items || r.data));
      api.get("/products", { params: { limit: 200 } }).then(r => setProducts(r.data.items || r.data));
    }
  }, [showModal]);

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

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { productId: 0, productName: "", quantity: 1, price: 0, total: 0, unit: "dona" }] }));
  }

  function updateItem(idx: number, field: string, value: any) {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      if (field === "productId") {
        const p = products.find(p => p.id === Number(value));
        if (p) { items[idx].productName = p.name; items[idx].price = p.wholesalePrice || p.price; items[idx].unit = "dona"; }
      }
      if (field === "quantity" || field === "price") {
        items[idx].total = Number(items[idx].quantity) * Number(items[idx].price);
      }
      return { ...f, items };
    });
  }

  function removeItem(idx: number) { setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) })); }

  const subtotal = form.items.reduce((s, i) => s + i.total, 0);
  const grandTotal = subtotal - (form.discount || 0);

  async function handleSave() {
    if (!form.customerId || !form.agentId || form.items.length === 0) {
      alert("Mijoz, agent va kamida 1 ta mahsulot tanlang!"); return;
    }
    setSaving(true);
    try {
      const payload = {
        customerId: form.customerId,
        agentId: form.agentId,
        discount: form.discount,
        note: form.note,
        items: form.items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price, total: i.total })),
      };
      await api.post("/orders", payload);
      setShowModal(false);
      setForm({ customerId: 0, agentId: 0, discount: 0, note: "", items: [] });
      loadOrders();
    } catch (e: any) {
      alert(e?.response?.data?.error || "Xato yuz berdi");
    } finally { setSaving(false); }
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

    // ===== VARAQ 1: JAMI NAKЛАДНАЯ =====
    const sheet1Data: any[][] = [];
    sheet1Data.push([`${companyName} - YÜKLAMA НАКЛАДНОЙ`]);
    sheet1Data.push([`Sana: ${now}`, "", "", "", `Jami buyurtmalar: ${targetOrders.length} ta`]);
    sheet1Data.push([]);
    sheet1Data.push(["№", "Buyurtma №", "Mijoz", "Agent", "Mahsulot", "Birlik", "Miqdor", "Narx (so'm)", "Jami (so'm)"]);

    let rowNum = 1;
    let grandTotal = 0;
    for (const order of targetOrders) {
      const items = order.items || [];
      if (items.length === 0) {
        sheet1Data.push([rowNum++, order.orderNo, order.customerName, order.agentName, "-", "-", "-", "-", "-"]);
      } else {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          sheet1Data.push([
            i === 0 ? rowNum++ : "",
            i === 0 ? order.orderNo : "",
            i === 0 ? order.customerName : "",
            i === 0 ? order.agentName : "",
            item.productName,
            "dona",
            item.quantity,
            item.price,
            item.total,
          ]);
          grandTotal += item.total;
        }
      }
      sheet1Data.push(["", "", "", "", "", "", "", `${order.orderNo} jami:`, order.total]);
      sheet1Data.push([]);
    }
    sheet1Data.push([]);
    sheet1Data.push(["", "", "", "", "", "", "", "UMUMIY JAMI:", grandTotal]);
    sheet1Data.push([]);
    sheet1Data.push(["Tovarni berdi:", "", "", "", "Tovarni oldi:", "", "", "", ""]);
    sheet1Data.push(["________________", "", "", "", "________________", "", "", "", ""]);
    sheet1Data.push(["(Imzo)", "", "", "", "(Imzo)", "", "", "", ""]);

    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
    ws1["!cols"] = [{ wch: 4 }, { wch: 16 }, { wch: 24 }, { wch: 18 }, { wch: 28 }, { wch: 8 }, { wch: 8 }, { wch: 16 }, { wch: 16 }];
    ws1["A1"] = { v: `${companyName} - YÜKLAMA НАКЛАДНОЙ`, t: "s" };
    XLSX.utils.book_append_sheet(wb, ws1, "Jami Nakладная");

    // ===== VARAQ 2: ALOHIDA NAKЛАДНАЯ =====
    const sheet2Data: any[][] = [];
    for (const order of targetOrders) {
      const items = order.items || [];
      const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString("uz-UZ") : now;

      sheet2Data.push([`НАКЛАДНАЯ № ${order.orderNo}`]);
      sheet2Data.push([`Sana: ${orderDate}`]);
      sheet2Data.push([]);
      sheet2Data.push([`Yetkazib beruvchi: ${companyName}`]);
      sheet2Data.push([`Oluvchi: ${order.customerName}`]);
      sheet2Data.push([`Agent: ${order.agentName}`]);
      sheet2Data.push([]);
      sheet2Data.push(["№", "Mahsulot nomi", "Birlik", "Miqdor", "Narx (so'm)", "Jami (so'm)"]);

      let orderSum = 0;
      items.forEach((item: any, i: number) => {
        sheet2Data.push([i + 1, item.productName, "dona", item.quantity, item.price, item.total]);
        orderSum += item.total;
      });

      sheet2Data.push([]);
      sheet2Data.push(["", "", "", "", "Jami:", orderSum]);
      if (order.discount) sheet2Data.push(["", "", "", "", "Chegirma:", -order.discount]);
      sheet2Data.push(["", "", "", "", "TO'LOV SUMMASI:", order.total]);
      sheet2Data.push([]);
      sheet2Data.push(["Tovarni berdi: ________________", "", "", "Tovarni oldi: ________________"]);
      sheet2Data.push(["M.O.", "", "", "M.O."]);
      sheet2Data.push([]);
      sheet2Data.push(["────────────────────────────────────────────────────────────────────"]);
      sheet2Data.push([]);
    }

    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
    ws2["!cols"] = [{ wch: 4 }, { wch: 32 }, { wch: 8 }, { wch: 8 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Alohida Nakладная");

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
        <button onClick={() => setShowModal(true)} className="btn-primary">
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

      {/* NEW ORDER MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Yangi buyurtma</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Customer & Agent */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mijoz *</label>
                  <select value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value={0}>— Tanlang —</option>
                    {customers.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agent *</label>
                  <select value={form.agentId} onChange={e => setForm(f => ({ ...f, agentId: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value={0}>— Tanlang —</option>
                    {agents.map((a: any) => <option key={a.id} value={a.id}>{a.fullName}</option>)}
                  </select>
                </div>
              </div>

              {/* Products */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Mahsulotlar *</label>
                  <button onClick={addItem} className="text-sm text-brand-600 hover:underline flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Qo'shish
                  </button>
                </div>
                {form.items.length === 0 && (
                  <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400">
                    Hali mahsulot qo'shilmagan. "Qo'shish" tugmasini bosing.
                  </div>
                )}
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                      <div className="col-span-5">
                        <select value={item.productId}
                          onChange={e => updateItem(idx, "productId", e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                          <option value={0}>— Mahsulot —</option>
                          {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.stock} dona)</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input type="number" min={1} placeholder="Miqdor" value={item.quantity}
                          onChange={e => updateItem(idx, "quantity", Number(e.target.value))}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div className="col-span-3">
                        <input type="number" min={0} placeholder="Narx" value={item.price}
                          onChange={e => updateItem(idx, "price", Number(e.target.value))}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div className="col-span-1 text-sm font-medium text-gray-700 text-right">
                        {formatCurrency(item.total)}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button onClick={() => removeItem(idx)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount & Note */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chegirma (so'm)</label>
                  <input type="number" min={0} value={form.discount}
                    onChange={e => setForm(f => ({ ...f, discount: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Izoh</label>
                  <input type="text" value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    placeholder="Ixtiyoriy..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              {/* Totals */}
              {form.items.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Jami (chegirmasiz):</span>
                    <span>{formatCurrency(subtotal)} so'm</span>
                  </div>
                  {form.discount > 0 && (
                    <div className="flex justify-between text-sm text-red-500">
                      <span>Chegirma:</span>
                      <span>-{formatCurrency(form.discount)} so'm</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
                    <span>TO'LOV SUMMASI:</span>
                    <span>{formatCurrency(grandTotal)} so'm</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Bekor qilish</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? "Saqlanmoqda..." : "Buyurtma yaratish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
