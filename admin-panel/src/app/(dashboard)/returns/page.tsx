"use client";
import { useEffect, useState } from "react";
import { Plus, X, CheckCircle, XCircle, PackageCheck } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { Badge } from "@/components/ui/Badge";

interface ReturnItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

interface ReturnOrder {
  id: number;
  returnNo: string;
  orderId?: number;
  customerId: number;
  customerName: string;
  agentId: number;
  agentName: string;
  status: string;
  reason: string;
  total: number;
  note?: string;
  itemCount: number;
  items: ReturnItem[];
  createdAt: string;
}

interface Customer { id: number; companyName: string; }
interface Agent { id: number; fullName: string; }
interface Product { id: number; name: string; price: number; }

const statusOptions = [
  { value: "", label: "Barcha" },
  { value: "PENDING", label: "Kutilmoqda" },
  { value: "APPROVED", label: "Tasdiqlandi" },
  { value: "REJECTED", label: "Rad etildi" },
  { value: "COMPLETED", label: "Bajarildi" },
];

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [form, setForm] = useState({
    customerId: "", agentId: "", reason: "", note: "",
    items: [{ productId: "", quantity: "1", price: "", total: "0" }],
  });
  const [saving, setSaving] = useState(false);
  const limit = 20;

  useEffect(() => { loadReturns(); }, [page, status]);
  useEffect(() => {
    api.get("/customers", { params: { limit: 200 } }).then((r) => setCustomers(r.data.items ?? []));
    api.get("/agents").then((r) => setAgents(r.data.items ?? r.data ?? []));
    api.get("/products", { params: { limit: 200 } }).then((r) => setProducts(r.data.items ?? []));
  }, []);

  async function loadReturns() {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (status) params.status = status;
      const { data } = await api.get("/returns", { params });
      setReturns(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  function updateItem(idx: number, field: string, value: string) {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    if (field === "productId" || field === "quantity" || field === "price") {
      const price = field === "price" ? Number(value) : Number(items[idx].price);
      const qty = field === "quantity" ? Number(value) : Number(items[idx].quantity);
      items[idx].total = String(price * qty);
      if (field === "productId") {
        const prod = products.find((p) => String(p.id) === value);
        if (prod) items[idx].price = String(prod.price);
      }
    }
    setForm({ ...form, items });
  }

  function addItem() {
    setForm({ ...form, items: [...form.items, { productId: "", quantity: "1", price: "", total: "0" }] });
  }

  function removeItem(idx: number) {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const items = form.items.map((i) => ({
        productId: Number(i.productId),
        quantity: Number(i.quantity),
        price: Number(i.price),
        total: Number(i.total),
      }));
      await api.post("/returns", {
        customerId: Number(form.customerId),
        agentId: Number(form.agentId),
        reason: form.reason,
        note: form.note || undefined,
        items,
      });
      setShowModal(false);
      setForm({ customerId: "", agentId: "", reason: "", note: "", items: [{ productId: "", quantity: "1", price: "", total: "0" }] });
      loadReturns();
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(id: number, action: "approve" | "reject" | "complete") {
    setActionLoading(id);
    try {
      await api.put(`/returns/${id}/${action}`);
      loadReturns();
    } finally {
      setActionLoading(null);
    }
  }

  const totalPages = Math.ceil(total / limit);
  const formTotal = form.items.reduce((s, i) => s + Number(i.total), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Qaytarishlar</h2>
          <p className="text-sm text-gray-500 mt-0.5">Jami {total} ta qaytarish</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Qaytarish yaratish
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <div className="flex gap-1 flex-wrap">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatus(opt.value); setPage(1); }}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${status === opt.value ? "bg-brand-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {opt.label}
            </button>
          ))}
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
                  <th>Raqam</th>
                  <th>Mijoz</th>
                  <th>Agent</th>
                  <th>Sabab</th>
                  <th>Mahsulotlar</th>
                  <th>Jami</th>
                  <th>Holat</th>
                  <th>Sana</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold text-brand-600">{r.returnNo}</td>
                    <td className="font-medium text-gray-900">{r.customerName}</td>
                    <td className="text-gray-600">{r.agentName}</td>
                    <td className="text-gray-500 text-sm max-w-36 truncate">{r.reason}</td>
                    <td className="text-gray-500">{r.itemCount} ta</td>
                    <td className="font-semibold text-gray-900">{formatCurrency(r.total)} so'm</td>
                    <td><Badge status={r.status} /></td>
                    <td className="text-gray-400 text-xs">{formatDateTime(r.createdAt)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {r.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleAction(r.id, "approve")}
                              disabled={actionLoading === r.id}
                              className="p-1.5 hover:bg-green-50 rounded-lg text-gray-400 hover:text-green-600 disabled:opacity-50"
                              title="Tasdiqlash"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleAction(r.id, "reject")}
                              disabled={actionLoading === r.id}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 disabled:opacity-50"
                              title="Rad etish"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {r.status === "APPROVED" && (
                          <button
                            onClick={() => handleAction(r.id, "complete")}
                            disabled={actionLoading === r.id}
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 disabled:opacity-50"
                            title="Bajarish"
                          >
                            <PackageCheck className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {returns.length === 0 && (
                  <tr><td colSpan={9} className="text-center text-gray-400 py-12">Qaytarishlar topilmadi</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">{total} ta qaytarish</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 text-sm rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40">‹</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 text-sm rounded-lg transition-colors ${page === p ? "bg-brand-500 text-white" : "hover:bg-gray-100 text-gray-600"}`}>{p}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 text-sm rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40">›</button>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="font-semibold text-gray-900">Qaytarish yaratish</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mijoz *</label>
                  <select
                    required
                    value={form.customerId}
                    onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Tanlang...</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agent *</label>
                  <select
                    required
                    value={form.agentId}
                    onChange={(e) => setForm({ ...form, agentId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Tanlang...</option>
                    {agents.map((a) => <option key={a.id} value={a.id}>{a.fullName}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sabab *</label>
                  <input
                    required
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Qaytarish sababi"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Mahsulotlar *</label>
                  <button type="button" onClick={addItem} className="text-sm text-brand-600 hover:text-brand-700 font-medium">+ Qo'shish</button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <select
                          required
                          value={item.productId}
                          onChange={(e) => updateItem(idx, "productId", e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="">Mahsulot...</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input
                          required
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                          placeholder="Miqdor"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          required
                          type="number"
                          value={item.price}
                          onChange={(e) => updateItem(idx, "price", e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                          placeholder="Narx"
                        />
                      </div>
                      <div className="col-span-2 text-sm text-gray-600 font-medium">
                        {formatCurrency(Number(item.total))}
                      </div>
                      <div className="col-span-1">
                        {form.items.length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-right text-sm font-semibold text-gray-900">
                  Jami: {formatCurrency(formTotal)} so'm
                </div>
              </div>

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
                  {saving ? "Saqlanmoqda..." : "Yaratish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
