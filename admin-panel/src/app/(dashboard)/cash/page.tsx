"use client";
import { useEffect, useState } from "react";
import { Plus, X, TrendingUp, TrendingDown, Wallet, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/formatters";

interface PaymentItem {
  id: number;
  customerName?: string;
  agentName?: string;
  amount: number;
  method: string;
  note?: string;
  createdAt: string;
}

interface SupplierPayment {
  id: number;
  supplierId: number;
  supplierName?: string;
  amount: number;
  method: string;
  note?: string;
  createdAt: string;
}

interface Expense {
  id: number;
  category: string;
  amount: number;
  description: string;
  method: string;
  createdAt: string;
}

interface Summary {
  totalIncome: number;
  totalExpenses: number;
  supplierDebt: number;
  balance: number;
}

const methodLabels: Record<string, string> = {
  CASH: "Naqd", CARD: "Karta", BANK_TRANSFER: "Bank o'tkazma", CHEQUE: "Chek",
};

const tabs = [
  { key: "customer", label: "Mijoz to'lovlari" },
  { key: "supplier", label: "Ta'minotchi to'lovlari" },
  { key: "expenses", label: "Xarajatlar" },
];

export default function CashPage() {
  const [activeTab, setActiveTab] = useState("customer");
  const [customerPayments, setCustomerPayments] = useState<PaymentItem[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalIncome: 0, totalExpenses: 0, supplierDebt: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: "Operatsional", amount: "", description: "", method: "CASH" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [paymentsRes, supplierPayRes, expensesRes, expSummaryRes, suppliersRes] = await Promise.all([
        api.get("/payments", { params: { limit: 50 } }),
        api.get("/suppliers"),
        api.get("/expenses", { params: { limit: 50 } }),
        api.get("/expenses/summary"),
        api.get("/suppliers"),
      ]);

      const payments = paymentsRes.data.items ?? [];
      setCustomerPayments(payments.map((p: any) => ({
        id: p.id,
        customerName: p.customerName,
        agentName: p.agentName,
        amount: p.amount,
        method: p.method,
        note: p.note,
        createdAt: p.createdAt,
      })));

      // Collect all supplier payments
      const allSupplierPayments: SupplierPayment[] = [];
      const suppliers = suppliersRes.data.items ?? [];
      for (const s of suppliers.slice(0, 5)) {
        const r = await api.get(`/suppliers/${s.id}/payments`, { params: { limit: 10 } });
        (r.data.items ?? []).forEach((p: any) => {
          allSupplierPayments.push({ ...p, supplierName: s.name });
        });
      }
      allSupplierPayments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSupplierPayments(allSupplierPayments);

      const expItems = expensesRes.data.items ?? [];
      setExpenses(expItems);

      const totalIncome = payments.reduce((s: number, p: any) => s + p.amount, 0);
      const totalExpenses = expSummaryRes.data.totalAmount ?? 0;
      const supplierDebt = suppliers.reduce((s: number, sup: any) => s + Math.max(0, sup.balance), 0);
      setSummary({
        totalIncome,
        totalExpenses,
        supplierDebt,
        balance: totalIncome - totalExpenses,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/expenses", expenseForm);
      setShowExpenseModal(false);
      setExpenseForm({ category: "Operatsional", amount: "", description: "", method: "CASH" });
      loadData();
    } finally {
      setSaving(false);
    }
  }

  const summaryCards = [
    { label: "Jami Kirim", value: summary.totalIncome, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Jami Xarajat", value: summary.totalExpenses, icon: TrendingDown, color: "text-red-600", bg: "bg-red-50" },
    { label: "Balans", value: summary.balance, icon: Wallet, color: summary.balance >= 0 ? "text-brand-600" : "text-red-600", bg: "bg-brand-50" },
    { label: "Ta'minotchi qarzi", value: summary.supplierDebt, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Kassa</h2>
          <p className="text-sm text-gray-500 mt-0.5">Moliyaviy harakatlar</p>
        </div>
        <button onClick={() => setShowExpenseModal(true)} className="btn-secondary">
          <Plus className="w-4 h-4" />
          Xarajat qo'shish
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className={`text-lg font-bold ${card.color}`}>{formatCurrency(card.value)} so'm</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === t.key ? "border-b-2 border-brand-500 text-brand-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === "customer" && (
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th>Mijoz</th>
                    <th>Agent</th>
                    <th>Summa</th>
                    <th>Usul</th>
                    <th>Izoh</th>
                    <th>Sana</th>
                  </tr>
                </thead>
                <tbody>
                  {customerPayments.map((p) => (
                    <tr key={p.id}>
                      <td className="font-medium text-gray-900">{p.customerName ?? "—"}</td>
                      <td className="text-gray-600">{p.agentName ?? "—"}</td>
                      <td className="font-semibold text-green-600">{formatCurrency(p.amount)} so'm</td>
                      <td className="text-gray-500">{methodLabels[p.method] ?? p.method}</td>
                      <td className="text-gray-400 text-sm">{p.note ?? "—"}</td>
                      <td className="text-gray-400 text-xs">{formatDateTime(p.createdAt)}</td>
                    </tr>
                  ))}
                  {customerPayments.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-gray-400 py-12">To'lovlar yo'q</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "supplier" && (
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th>Ta'minotchi</th>
                    <th>Summa</th>
                    <th>Usul</th>
                    <th>Izoh</th>
                    <th>Sana</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierPayments.map((p) => (
                    <tr key={p.id}>
                      <td className="font-medium text-gray-900">{p.supplierName ?? "—"}</td>
                      <td className="font-semibold text-red-600">{formatCurrency(p.amount)} so'm</td>
                      <td className="text-gray-500">{methodLabels[p.method] ?? p.method}</td>
                      <td className="text-gray-400 text-sm">{p.note ?? "—"}</td>
                      <td className="text-gray-400 text-xs">{formatDateTime(p.createdAt)}</td>
                    </tr>
                  ))}
                  {supplierPayments.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-gray-400 py-12">To'lovlar yo'q</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "expenses" && (
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th>Kategoriya</th>
                    <th>Tavsif</th>
                    <th>Summa</th>
                    <th>Usul</th>
                    <th>Sana</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">{e.category}</span>
                      </td>
                      <td className="text-gray-700">{e.description}</td>
                      <td className="font-semibold text-red-600">{formatCurrency(e.amount)} so'm</td>
                      <td className="text-gray-500">{methodLabels[e.method] ?? e.method}</td>
                      <td className="text-gray-400 text-xs">{formatDateTime(e.createdAt)}</td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-gray-400 py-12">Xarajatlar yo'q</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Xarajat qo'shish</h3>
              <button onClick={() => setShowExpenseModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategoriya *</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Marketing">Marketing</option>
                  <option value="Logistika">Logistika</option>
                  <option value="Operatsional">Operatsional</option>
                  <option value="Boshqa">Boshqa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tavsif *</label>
                <input
                  required
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Xarajat tavsifi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Summa (so'm) *</label>
                <input
                  required
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To'lov usuli</label>
                <select
                  value={expenseForm.method}
                  onChange={(e) => setExpenseForm({ ...expenseForm, method: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="CASH">Naqd</option>
                  <option value="CARD">Karta</option>
                  <option value="BANK_TRANSFER">Bank o'tkazma</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="flex-1 btn-secondary">Bekor</button>
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
