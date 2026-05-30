"use client";
import { useEffect, useState } from "react";
import { AlertCircle, Phone, ChevronRight } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { formatCurrencyFull } from "@/lib/formatters";

export default function DebtsPage() {
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/payments/debts").then((r) => { setDebts(r.data); setLoading(false); });
  }, []);

  const totalDebt = debts.reduce((s, d) => s + d.totalDebt, 0);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-5 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Qarzlar</h1>
        <p className="text-sm text-gray-400 mt-0.5">{debts.length} ta qarzli mijoz</p>
      </div>

      {/* Total summary */}
      <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <div>
            <p className="text-xs text-red-400 font-medium">Jami qarz</p>
            <p className="text-lg font-bold text-red-600">{formatCurrencyFull(totalDebt)}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {debts.map((d) => (
          <Link key={d.customerId} href={`/customers/${d.customerId}`} className="mobile-card p-4 flex items-center gap-3 active:scale-98 transition-transform">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${d.status === "CRITICAL" ? "bg-red-100 text-red-700" : d.status === "OVERDUE" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
              {d.customerName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{d.customerName}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{d.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-red-600">{formatCurrencyFull(d.totalDebt)}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.status === "CRITICAL" ? "bg-red-100 text-red-700" : d.status === "OVERDUE" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                {d.status === "CRITICAL" ? "Kritik" : d.status === "OVERDUE" ? "Muddati o'tgan" : "Joriy"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 ml-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}
