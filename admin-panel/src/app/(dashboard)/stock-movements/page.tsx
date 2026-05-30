"use client";
import { useEffect, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { Badge } from "@/components/ui/Badge";

interface StockMovement {
  id: number;
  type: string;
  productId: number;
  productName: string;
  fromWarehouseName?: string;
  toWarehouseName?: string;
  supplierName?: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  batchNo?: string;
  note?: string;
  createdAt: string;
}

interface Product { id: number; name: string; }
interface Warehouse { id: number; name: string; }
interface Supplier { id: number; name: string; }

const tabs = [
  { key: "", label: "Hammasi" },
  { key: "INCOMING", label: "Kirim" },
  { key: "OUTGOING", label: "Chiqim" },
  { key: "TRANSFER", label: "Ko'chirish" },
  { key: "ADJUSTMENT", label: "Tuzatish" },
];

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"incoming" | "outgoing" | "transfer" | "adjustment">("incoming");

  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [form, setForm] = useState({
    productId: "", toWarehouseId: "", fromWarehouseId: "",
    supplierId: "", quantity: "", unitCost: "", batchNo: "", note: "",
  });
  const [saving, setSaving] = useState(false);

  const limit = 20;

  useEffect(() => { loadMovements(); }, [page, activeTab]);
  useEffect(() => {
    api.get("/products", { params: { limit: 100 } }).then((r) => setProducts(r.data.items ?? []));
    api.get("/warehouses").then((r) => setWarehouses(r.data.items ?? r.data ?? []));
    api.get("/suppliers").then((r) => setSuppliers(r.data.items ?? []));
  }, []);

  async function loadMovements() {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (activeTab) params.type = activeTab;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const { data } = await api.get("/stock-movements", { params });
      setMovements(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  function openModal(type: typeof modalType) {
    setModalType(type);
    setForm({ productId: "", toWarehouseId: "", fromWarehouseId: "", supplierId: "", quantity: "", unitCost: "", batchNo: "", note: "" });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        productId: Number(form.productId),
        quantity: Number(form.quantity),
        note: form.note || undefined,
      };
      if (modalType === "incoming") {
        payload.toWarehouseId = Number(form.toWarehouseId);
        if (form.supplierId) payload.supplierId = Number(form.supplierId);
        if (form.unitCost) payload.unitCost = Number(form.unitCost);
        if (form.batchNo) payload.batchNo = form.batchNo;
      } else if (modalType === "outgoing") {
        payload.fromWarehouseId = Number(form.fromWarehouseId);
      } else if (modalType === "transfer") {
        payload.fromWarehouseId = Number(form.fromWarehouseId);
        payload.toWarehouseId = Number(form.toWarehouseId);
      } else if (modalType === "adjustment") {
        payload.warehouseId = Number(form.toWarehouseId);
      }
      await api.post(`/stock-movements/${modalType}`, payload);
      setShowModal(false);
      loadMovements();
    } finally {
      setSaving(false);
    }
  }

  const totalPages = Math.ceil(total / limit);

  const modalTitles = {
    incoming: "Kirim qo'shish",
    outgoing: "Chiqim qo'shish",
    transfer: "Ko'chirish",
    adjustment: "Tuzatish",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Kirim / Chiqim</h2>
          <p className="text-sm text-gray-500 mt-0.5">Ombor harakatlari</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openModal("incoming")} className="btn-primary">
            <Plus className="w-4 h-4" />
            Kirim
          </button>
          <button onClick={() => openModal("outgoing")} className="btn-secondary">
            <Plus className="w-4 h-4" />
            Chiqim
          </button>
          <button onClick={() => openModal("transfer")} className="btn-secondary">
            <Plus className="w-4 h-4" />
            Ko'chirish
          </button>
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-3">
        <div className="flex gap-1 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setPage(1); }}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${activeTab === t.key ? "bg-brand-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-500">Dan:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <label className="text-sm text-gray-500">Gacha:</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button onClick={() => loadMovements()} className="btn-secondary">Filter</button>
        </div>
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
                  <th>Tur</th>
                  <th>Mahsulot</th>
                  <th>Omborxona</th>
                  <th>Miqdor</th>
                  <th>Narx</th>
                  <th>Summa</th>
                  <th>Izoh</th>
                  <th>Sana</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td><Badge status={m.type} /></td>
                    <td className="font-medium text-gray-900">{m.productName}</td>
                    <td className="text-gray-600 text-sm">
                      {m.fromWarehouseName && <div>Dan: {m.fromWarehouseName}</div>}
                      {m.toWarehouseName && <div>Ga: {m.toWarehouseName}</div>}
                      {m.supplierName && <div className="text-brand-600">Ta'minotchi: {m.supplierName}</div>}
                    </td>
                    <td className="font-semibold text-gray-900">{m.quantity.toLocaleString()}</td>
                    <td className="text-gray-600">{m.unitCost ? `${formatCurrency(m.unitCost)} so'm` : "—"}</td>
                    <td className="font-semibold">{m.totalCost ? `${formatCurrency(m.totalCost)} so'm` : "—"}</td>
                    <td className="text-gray-500 text-sm max-w-32 truncate">{m.note ?? "—"}</td>
                    <td className="text-gray-400 text-xs">{formatDateTime(m.createdAt)}</td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-gray-400 py-12">Harakatlar topilmadi</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">{total} ta harakat</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 text-sm rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40">‹</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 text-sm rounded-lg transition-colors ${page === p ? "bg-brand-500 text-white" : "hover:bg-gray-100 text-gray-600"}`}>{p}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 text-sm rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40">›</button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{modalTitles[modalType]}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mahsulot *</label>
                <select
                  required
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Tanlang...</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {(modalType === "outgoing" || modalType === "transfer") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qaysi ombordan *</label>
                  <select
                    required
                    value={form.fromWarehouseId}
                    onChange={(e) => setForm({ ...form, fromWarehouseId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Tanlang...</option>
                    {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              )}

              {(modalType === "incoming" || modalType === "transfer" || modalType === "adjustment") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {modalType === "adjustment" ? "Omborxona *" : "Qaysi omborga *"}
                  </label>
                  <select
                    required
                    value={form.toWarehouseId}
                    onChange={(e) => setForm({ ...form, toWarehouseId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Tanlang...</option>
                    {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              )}

              {modalType === "incoming" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ta'minotchi</label>
                  <select
                    value={form.supplierId}
                    onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Tanlang...</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Miqdor *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="0"
                  />
                </div>
                {modalType === "incoming" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Narx (so'm)</label>
                    <input
                      type="number"
                      value={form.unitCost}
                      onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              {modalType === "incoming" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch No</label>
                  <input
                    value={form.batchNo}
                    onChange={(e) => setForm({ ...form, batchNo: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Ixtiyoriy"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Izoh</label>
                <input
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Ixtiyoriy"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary">Bekor</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary">
                  {saving ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
