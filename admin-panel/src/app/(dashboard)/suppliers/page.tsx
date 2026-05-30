"use client";
import { useEffect, useState } from "react";
import { Plus, Search, Eye, Trash2, Phone, Mail, X, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { Badge } from "@/components/ui/Badge";

interface Supplier {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  taxId?: string;
  balance: number;
  isActive: boolean;
  paymentCount: number;
  createdAt: string;
}

interface SupplierPayment {
  id: number;
  amount: number;
  method: string;
  note?: string;
  createdAt: string;
}

const methodLabels: Record<string, string> = {
  CASH: "Naqd",
  CARD: "Karta",
  BANK_TRANSFER: "Bank o'tkazma",
  CHEQUE: "Chek",
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [form, setForm] = useState({
    name: "", contactPerson: "", phone: "", email: "", address: "", taxId: "",
  });
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "CASH", note: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSuppliers(); }, []);

  async function loadSuppliers() {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      const { data } = await api.get("/suppliers", { params });
      setSuppliers(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/suppliers", form);
      setShowModal(false);
      setForm({ name: "", contactPerson: "", phone: "", email: "", address: "", taxId: "" });
      loadSuppliers();
    } finally {
      setSaving(false);
    }
  }

  async function handleView(supplier: Supplier) {
    setSelectedSupplier(supplier);
    const { data } = await api.get(`/suppliers/${supplier.id}/payments`);
    setPayments(data.items);
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSupplier) return;
    setSaving(true);
    try {
      await api.post(`/suppliers/${selectedSupplier.id}/payments`, paymentForm);
      setShowPaymentModal(false);
      setPaymentForm({ amount: "", method: "CASH", note: "" });
      const { data } = await api.get(`/suppliers/${selectedSupplier.id}/payments`);
      setPayments(data.items);
      loadSuppliers();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Ta'minotchini o'chirishni tasdiqlaysizmi?")) return;
    await api.delete(`/suppliers/${id}`);
    loadSuppliers();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Ta'minotchilar</h2>
          <p className="text-sm text-gray-500 mt-0.5">Jami {total} ta ta'minotchi</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Yangi ta'minotchi
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <form onSubmit={(e) => { e.preventDefault(); loadSuppliers(); }} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Ism, telefon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button type="submit" className="btn-secondary">Qidirish</button>
        </form>
      </div>

      {/* Two panels */}
      <div className={`grid gap-4 ${selectedSupplier ? "grid-cols-5" : "grid-cols-1"}`}>
        {/* Table */}
        <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden ${selectedSupplier ? "col-span-3" : ""}`}>
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th>Nomi</th>
                    <th>Bog'lanish</th>
                    <th>Telefon</th>
                    <th>Balans</th>
                    <th>Holat</th>
                    <th>Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id} className={`cursor-pointer ${selectedSupplier?.id === s.id ? "bg-brand-50" : ""}`} onClick={() => handleView(s)}>
                      <td>
                        <div className="font-medium text-gray-900">{s.name}</div>
                        {s.taxId && <div className="text-xs text-gray-400">INN: {s.taxId}</div>}
                      </td>
                      <td className="text-gray-600">{s.contactPerson}</td>
                      <td>
                        <div className="flex items-center gap-1 text-gray-600">
                          <Phone className="w-3 h-3" />
                          {s.phone}
                        </div>
                        {s.email && (
                          <div className="flex items-center gap-1 text-gray-400 text-xs">
                            <Mail className="w-3 h-3" />
                            {s.email}
                          </div>
                        )}
                      </td>
                      <td className={`font-semibold ${s.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatCurrency(Math.abs(s.balance))} so'm
                        {s.balance > 0 && <div className="text-xs font-normal text-red-400">Qarzdor</div>}
                      </td>
                      <td>
                        <Badge status={s.isActive ? "ACTIVE" : "INACTIVE"} />
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleView(s); }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-brand-600"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {suppliers.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-gray-400 py-12">Ta'minotchilar topilmadi</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedSupplier && (
          <div className="col-span-2 space-y-3">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedSupplier.name}</h3>
                  <p className="text-sm text-gray-500">{selectedSupplier.contactPerson}</p>
                </div>
                <button onClick={() => setSelectedSupplier(null)} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Telefon</span>
                  <span className="font-medium">{selectedSupplier.phone}</span>
                </div>
                {selectedSupplier.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="font-medium">{selectedSupplier.email}</span>
                  </div>
                )}
                {selectedSupplier.address && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Manzil</span>
                    <span className="font-medium text-right max-w-32">{selectedSupplier.address}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-gray-100">
                  <span className="text-gray-500">Balans</span>
                  <span className={`font-bold ${selectedSupplier.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(Math.abs(selectedSupplier.balance))} so'm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">To'lovlar</span>
                  <span className="font-medium">{selectedSupplier.paymentCount} ta</span>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="mt-3 w-full btn-primary text-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                To'lov qo'shish
              </button>
            </div>

            {/* Payments */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700">To'lov tarixi</h4>
              </div>
              <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                {payments.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">To'lovlar yo'q</p>
                ) : (
                  payments.map((p) => (
                    <div key={p.id} className="px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{methodLabels[p.method] ?? p.method}</div>
                        {p.note && <div className="text-xs text-gray-400">{p.note}</div>}
                        <div className="text-xs text-gray-400">{formatDateTime(p.createdAt)}</div>
                      </div>
                      <div className="text-sm font-bold text-green-600">{formatCurrency(p.amount)} so'm</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Yangi ta'minotchi</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomi *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Kompaniya nomi"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bog'lanish shaxsi *</label>
                  <input
                    required
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="F.I.O."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                  <input
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="+998..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">INN</label>
                  <input
                    value={form.taxId}
                    onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Soliq raqami"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Manzil"
                  />
                </div>
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

      {/* Payment Modal */}
      {showPaymentModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">To'lov qo'shish</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Summa (so'm) *</label>
                <input
                  required
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To'lov usuli</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="CASH">Naqd</option>
                  <option value="CARD">Karta</option>
                  <option value="BANK_TRANSFER">Bank o'tkazma</option>
                  <option value="CHEQUE">Chek</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Izoh</label>
                <input
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Ixtiyoriy"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 btn-secondary">Bekor</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary">
                  {saving ? "..." : "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
