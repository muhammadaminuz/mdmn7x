"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Wallet, Plus, CreditCard, Banknote, Building2, Loader2, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { formatCurrencyFull, formatDate } from "@/lib/formatters";

const methods = [
  { id: "CASH", label: "Naqd pul", icon: Banknote, color: "bg-green-50 border-green-200 text-green-700" },
  { id: "CARD", label: "Plastik karta", icon: CreditCard, color: "bg-blue-50 border-blue-200 text-blue-700" },
  { id: "BANK_TRANSFER", label: "Bank o'tkazmasi", icon: Building2, color: "bg-purple-50 border-purple-200 text-purple-700" },
];

function CollectionsContent() {
  const params = useSearchParams();
  const [payments, setPayments] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState({ customerId: params.get("customerId") || "", amount: "", method: "CASH", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("agent_user") || "{}");
    Promise.all([
      api.get("/payments", { params: { agentId: user.agent?.id, limit: 20 } }),
      api.get("/customers", { params: { agentId: user.agent?.id, limit: 50 } }),
    ]).then(([p, c]) => {
      setPayments(p.data.items);
      setCustomers(c.data.items);
    }).finally(() => setLoading(false));
    if (params.get("customerId")) setShowForm(true);
  }, []);

  async function submit() {
    if (!form.customerId || !form.amount) return;
    setSubmitting(true);
    try {
      const user = JSON.parse(localStorage.getItem("agent_user") || "{}");
      const cust = customers.find((c) => c.id === Number(form.customerId));
      await api.post("/payments", {
        customerId: Number(form.customerId),
        customerName: cust?.companyName || "Mijoz",
        agentId: user.agent?.id,
        amount: Number(form.amount),
        method: form.method,
        note: form.note,
      });
      setSuccess(true);
      setForm({ customerId: "", amount: "", method: "CASH", note: "" });
      setTimeout(() => { setSuccess(false); setShowForm(false); }, 2000);
      const p = await api.get("/payments", { params: { agentId: user.agent?.id, limit: 20 } });
      setPayments(p.data.items);
    } finally { setSubmitting(false); }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Inkassatsiya</h1>
          <button onClick={() => setShowForm(!showForm)} className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Collection form */}
        {showForm && (
          <div className="mobile-card p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Yangi to'lov qabul qilish</h3>
            {success ? (
              <div className="flex flex-col items-center py-4 text-primary-600">
                <CheckCircle2 className="w-12 h-12 mb-2" />
                <p className="font-semibold">To'lov muvaffaqiyatli qabul qilindi!</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Mijoz</label>
                  <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">Mijoz tanlang</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.companyName}{c.debt > 0 ? ` (qarz: ${(c.debt/1000).toFixed(0)}K)` : ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Summa (so'm)</label>
                  <input type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">To'lov usuli</label>
                  <div className="grid grid-cols-3 gap-2">
                    {methods.map((m) => (
                      <button key={m.id} onClick={() => setForm({ ...form, method: m.id })}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-colors ${form.method === m.id ? m.color + " border-current" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                        <m.icon className="w-5 h-5" />
                        <span className="text-xs font-medium text-center leading-tight">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={submit} disabled={submitting || !form.customerId || !form.amount} className="green-btn disabled:opacity-50">
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
                  {submitting ? "Saqlanmoqda..." : "To'lovni qabul qilish"}
                </button>
              </>
            )}
          </div>
        )}

        {/* History */}
        <div className="mobile-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-900 text-sm">To'lovlar tarixi</div>
          {payments.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-gray-400">
              <Wallet className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">To'lovlar yo'q</p>
            </div>
          ) : payments.map((p) => (
            <div key={p.id} className="px-4 py-3 flex items-center gap-3 border-b border-gray-50 last:border-0">
              <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Banknote className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{p.customerName}</p>
                <p className="text-xs text-gray-400">{formatDate(p.createdAt)} · {p.method === "CASH" ? "Naqd" : p.method === "CARD" ? "Karta" : "Bank"}</p>
              </div>
              <p className="text-sm font-bold text-green-600">+{formatCurrencyFull(p.amount)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CollectionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>}>
      <CollectionsContent />
    </Suspense>
  );
}
