"use client";
import { useEffect, useState } from "react";
import { Plus, X, Edit2 } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { Badge } from "@/components/ui/Badge";

interface BonusRule {
  id: number;
  name: string;
  targetType: string;
  targetValue: number;
  bonusAmount: number;
  bonusType: string;
  isActive: boolean;
  logCount: number;
  createdAt: string;
}

interface BonusLog {
  id: number;
  agentId: number;
  agentName: string;
  ruleId?: number;
  ruleName?: string;
  amount: number;
  description: string;
  month: number;
  year: number;
  createdAt: string;
}

interface Agent { id: number; fullName: string; }

const targetTypeLabels: Record<string, string> = {
  SALES_AMOUNT: "Savdo summasi",
  ORDER_COUNT: "Buyurtmalar soni",
  CUSTOMER_COUNT: "Mijozlar soni",
};

const bonusTypeLabels: Record<string, string> = {
  FIXED: "Belgilangan",
  PERCENTAGE: "Foiz",
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Okt", "Noy", "Dek"];

export default function BonusesPage() {
  const [rules, setRules] = useState<BonusRule[]>([]);
  const [logs, setLogs] = useState<BonusLog[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));

  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editRule, setEditRule] = useState<BonusRule | null>(null);

  const [ruleForm, setRuleForm] = useState({
    name: "", targetType: "SALES_AMOUNT", targetValue: "", bonusAmount: "", bonusType: "FIXED",
  });
  const [logForm, setLogForm] = useState({
    agentId: "", amount: "", description: "", month: String(now.getMonth() + 1), year: String(now.getFullYear()),
  });
  const [saving, setSaving] = useState(false);
  const limit = 20;

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadLogs(); }, [logPage, filterMonth, filterYear]);

  async function loadData() {
    setLoading(true);
    try {
      const [rulesRes, agentsRes] = await Promise.all([
        api.get("/bonuses/rules"),
        api.get("/agents"),
      ]);
      setRules(rulesRes.data.items ?? []);
      setAgents(agentsRes.data.items ?? agentsRes.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function loadLogs() {
    const params: any = { page: logPage, limit };
    if (filterMonth) params.month = filterMonth;
    if (filterYear) params.year = filterYear;
    const { data } = await api.get("/bonuses/logs", { params });
    setLogs(data.items);
    setLogTotal(data.total);
  }

  async function handleRuleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editRule) {
        await api.put(`/bonuses/rules/${editRule.id}`, ruleForm);
      } else {
        await api.post("/bonuses/rules", ruleForm);
      }
      setShowRuleModal(false);
      setEditRule(null);
      setRuleForm({ name: "", targetType: "SALES_AMOUNT", targetValue: "", bonusAmount: "", bonusType: "FIXED" });
      loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleLogSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/bonuses/logs", logForm);
      setShowLogModal(false);
      setLogForm({ agentId: "", amount: "", description: "", month: String(now.getMonth() + 1), year: String(now.getFullYear()) });
      loadLogs();
    } finally {
      setSaving(false);
    }
  }

  function openEditRule(rule: BonusRule) {
    setEditRule(rule);
    setRuleForm({
      name: rule.name,
      targetType: rule.targetType,
      targetValue: String(rule.targetValue),
      bonusAmount: String(rule.bonusAmount),
      bonusType: rule.bonusType,
    });
    setShowRuleModal(true);
  }

  const totalPages = Math.ceil(logTotal / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Bonus tizimi</h2>
          <p className="text-sm text-gray-500 mt-0.5">Agentlar uchun bonus qoidalari va natijalari</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditRule(null); setShowRuleModal(true); }} className="btn-secondary">
            <Plus className="w-4 h-4" />
            Qoida qo'shish
          </button>
          <button onClick={() => setShowLogModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Bonus berish
          </button>
        </div>
      </div>

      {/* Rules Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-medium text-gray-700">Bonus qoidalari</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Nomi</th>
                  <th>Maqsad turi</th>
                  <th>Maqsad qiymati</th>
                  <th>Bonus miqdori</th>
                  <th>Bonus turi</th>
                  <th>Holat</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium text-gray-900">{r.name}</td>
                    <td className="text-gray-600">{targetTypeLabels[r.targetType] ?? r.targetType}</td>
                    <td className="text-gray-600">
                      {r.targetType === "SALES_AMOUNT"
                        ? `${formatCurrency(r.targetValue)} so'm`
                        : r.targetValue.toLocaleString()}
                    </td>
                    <td className="font-semibold text-green-600">
                      {r.bonusType === "PERCENTAGE"
                        ? `${r.bonusAmount}%`
                        : `${formatCurrency(r.bonusAmount)} so'm`}
                    </td>
                    <td className="text-gray-600">{bonusTypeLabels[r.bonusType] ?? r.bonusType}</td>
                    <td><Badge status={r.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                    <td>
                      <button
                        onClick={() => openEditRule(r)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-brand-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-gray-400 py-8">Qoidalar yo'q</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Logs Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-medium text-gray-700">Bonus tarixi</h3>
          <div className="flex items-center gap-2">
            <select
              value={filterMonth}
              onChange={(e) => { setFilterMonth(e.target.value); setLogPage(1); }}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {monthNames.map((m, i) => (
                <option key={i + 1} value={String(i + 1)}>{m}</option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={(e) => { setFilterYear(e.target.value); setLogPage(1); }}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Qoida</th>
                <th>Tavsif</th>
                <th>Bonus</th>
                <th>Oy/Yil</th>
                <th>Sana</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="font-medium text-gray-900">{l.agentName}</td>
                  <td className="text-gray-500">{l.ruleName ?? "Qo'lda"}</td>
                  <td className="text-gray-600">{l.description}</td>
                  <td className="font-semibold text-green-600">{formatCurrency(l.amount)} so'm</td>
                  <td className="text-gray-500">{monthNames[l.month - 1]} {l.year}</td>
                  <td className="text-gray-400 text-xs">{formatDateTime(l.createdAt)}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-400 py-8">Bonuslar yo'q</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">{logTotal} ta bonus</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setLogPage((p) => Math.max(1, p - 1))} disabled={logPage === 1} className="w-8 h-8 text-sm rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40">‹</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setLogPage(p)} className={`w-8 h-8 text-sm rounded-lg transition-colors ${logPage === p ? "bg-brand-500 text-white" : "hover:bg-gray-100 text-gray-600"}`}>{p}</button>
            ))}
            <button onClick={() => setLogPage((p) => Math.min(totalPages, p + 1))} disabled={logPage === totalPages} className="w-8 h-8 text-sm rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40">›</button>
          </div>
        </div>
      </div>

      {/* Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{editRule ? "Qoidani tahrirlash" : "Yangi qoida"}</h3>
              <button onClick={() => { setShowRuleModal(false); setEditRule(null); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRuleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomi *</label>
                <input
                  required
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Qoida nomi"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maqsad turi</label>
                  <select
                    value={ruleForm.targetType}
                    onChange={(e) => setRuleForm({ ...ruleForm, targetType: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="SALES_AMOUNT">Savdo summasi</option>
                    <option value="ORDER_COUNT">Buyurtmalar soni</option>
                    <option value="CUSTOMER_COUNT">Mijozlar soni</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maqsad qiymati *</label>
                  <input
                    required
                    type="number"
                    value={ruleForm.targetValue}
                    onChange={(e) => setRuleForm({ ...ruleForm, targetValue: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bonus turi</label>
                  <select
                    value={ruleForm.bonusType}
                    onChange={(e) => setRuleForm({ ...ruleForm, bonusType: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="FIXED">Belgilangan</option>
                    <option value="PERCENTAGE">Foiz</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bonus miqdori *</label>
                  <input
                    required
                    type="number"
                    value={ruleForm.bonusAmount}
                    onChange={(e) => setRuleForm({ ...ruleForm, bonusAmount: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowRuleModal(false); setEditRule(null); }} className="flex-1 btn-secondary">Bekor</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary">
                  {saving ? "..." : editRule ? "Yangilash" : "Yaratish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Bonus berish</h3>
              <button onClick={() => setShowLogModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleLogSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent *</label>
                <select
                  required
                  value={logForm.agentId}
                  onChange={(e) => setLogForm({ ...logForm, agentId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Tanlang...</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Summa (so'm) *</label>
                <input
                  required
                  type="number"
                  value={logForm.amount}
                  onChange={(e) => setLogForm({ ...logForm, amount: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tavsif *</label>
                <input
                  required
                  value={logForm.description}
                  onChange={(e) => setLogForm({ ...logForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Bonus sababi"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Oy</label>
                  <select
                    value={logForm.month}
                    onChange={(e) => setLogForm({ ...logForm, month: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {monthNames.map((m, i) => (
                      <option key={i + 1} value={String(i + 1)}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yil</label>
                  <select
                    value={logForm.year}
                    onChange={(e) => setLogForm({ ...logForm, year: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {[2024, 2025, 2026].map((y) => <option key={y} value={String(y)}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowLogModal(false)} className="flex-1 btn-secondary">Bekor</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary">
                  {saving ? "..." : "Berish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
