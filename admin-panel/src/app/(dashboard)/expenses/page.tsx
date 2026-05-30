"use client";
import { useEffect, useState } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/formatters";

interface Expense {
  id: number;
  category: string;
  amount: number;
  description: string;
  paidByName?: string;
  method: string;
  createdAt: string;
}

interface CategorySummary {
  category: string;
  total: number;
  count: number;
}

const methodLabels: Record<string, string> = {
  CASH: "Naqd", CARD: "Karta", BANK_TRANSFER: "Bank o'tkazma", CHEQUE: "Chek",
};

const categoryIcons: Record<string, string> = {
  Marketing: "📢",
  Logistika: "🚚",
  Operatsional: "⚙️",
  Boshqa: "📦",
};

const categoryColors: Record<string, string> = {
  Marketing: "bg-purple-50 border-purple-200 text-purple-700",
  Logistika: "bg-blue-50 border-blue-200 text-blue-700",
  Operatsional: "bg-green-50 border-green-200 text-green-700",
  Boshqa: "bg-gray-50 border-gray-200 text-gray-700",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<CategorySummary[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category: "Operatsional", amount: "", description: "", method: "CASH" });
  const [saving, setSaving] = useState(false);
  const limit = 20;

  useEffect(() => { loadData(); }, [page, categoryFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [listRes, summaryRes] = await Promise.all([
        api.get("/expenses", { params: { page, limit, category: categoryFilter || undefined } }),
        api.get("/expenses/summary"),
      ]);
      setExpenses(listRes.data.items);
      setTotal(listRes.data.total);
      setSummary(summaryRes.data.summary);
      setTotalAmount(summaryRes.data.totalAmount);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/expenses", form);
      setShowModal(false);
      setForm({ category: "Operatsional", amount: "", description: "", method: "CASH" });
      loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Xarajatni o'chirishni tasdiqlaysizmi?")) return;
    await api.delete(`/expenses/${id}`);
    loadData();
  }

  const totalPages = Math.ceil(total / limit);
  const categories = ["Marketing", "Logistika", "Operatsional", "Boshqa"];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Xarajatlar</h2>
          <p className="text-sm text-gray-500 mt-0.5">Jami: {formatCurrency(totalAmount)} so'm</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Xarajat qo'shish
        </button>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((cat) => {
          const s = summary.find((s) => s.category === cat);
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? "" : cat)}
              className={`p-4 rounded-xl border text-left transition-all ${categoryFilter === cat ? "ring-2 ring-brand-500" : ""} ${categoryColors[cat] ?? "bg-gray-50 border-gray-200"}`}
            >
              <div className="text-2xl mb-1">{categoryIcons[cat] ?? "📋"}</div>
              <div className="font-semibold text-sm">{cat}</div>
              <div className="text-lg font-bold mt-1">{formatCurrency(s?.total ?? 0)} so'm</div>
              <div className="text-xs opacity-70">{s?.count ?? 0} ta xarajat</div>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-medium text-gray-700">
            {categoryFilter ? `${categoryFilter} xarajatlari` : "Barcha xarajatlar"}
          </h3>
          {categoryFilter && (
            <button onClick={() => setCategoryFilter("")} className="text-sm text-brand-600 hover:text-brand-700">
              Barchasini ko'rsatish
            </button>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Kategoriya</th>
                  <th>Tavsif</th>
                  <th>Summa</th>
                  <th>To'lov usuli</th>
                  <th>Kim tomonidan</th>
                  <th>Sana</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${categoryColors[e.category] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {categoryIcons[e.category]} {e.category}
                      </span>
                    </td>
                    <td className="text-gray-700">{e.description}</td>
                    <td className="font-semibold text-red-600">{formatCurrency(e.amount)} so'm</td>
                    <td className="text-gray-500">{methodLabels[e.method] ?? e.method}</td>
                    <td className="text-gray-500">{e.paidByName ?? "—"}</td>
                    <td className="text-gray-400 text-xs">{formatDateTime(e.createdAt)}</td>
                    <td>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-gray-400 py-12">Xarajatlar topilmadi</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">{total} ta xarajat</span>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Xarajat qo'shish</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategoriya *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tavsif *</label>
                <input
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Xarajat tavsifi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Summa (so'm) *</label>
                <input
                  required
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To'lov usuli</label>
                <select
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="CASH">Naqd</option>
                  <option value="CARD">Karta</option>
                  <option value="BANK_TRANSFER">Bank o'tkazma</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary">Bekor</button>
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
