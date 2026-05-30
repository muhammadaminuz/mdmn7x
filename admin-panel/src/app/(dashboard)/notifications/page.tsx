"use client";
import { useEffect, useState } from "react";
import { Bell, ShoppingCart, AlertCircle, TrendingUp, Package, CreditCard, CheckCheck } from "lucide-react";
import api from "@/lib/api";
import { timeAgo } from "@/lib/formatters";
import { Notification } from "@/types";

const typeIcons: Record<string, React.ReactNode> = {
  NEW_ORDER: <ShoppingCart className="w-4 h-4 text-blue-500" />,
  DEBT_REMINDER: <AlertCircle className="w-4 h-4 text-red-500" />,
  TARGET_ACHIEVED: <TrendingUp className="w-4 h-4 text-green-500" />,
  LOW_STOCK: <Package className="w-4 h-4 text-amber-500" />,
  PAYMENT_RECEIVED: <CreditCard className="w-4 h-4 text-purple-500" />,
};
const typeBgs: Record<string, string> = {
  NEW_ORDER: "bg-blue-50",
  DEBT_REMINDER: "bg-red-50",
  TARGET_ACHIEVED: "bg-green-50",
  LOW_STOCK: "bg-amber-50",
  PAYMENT_RECEIVED: "bg-purple-50",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await api.get("/notifications");
    setItems(data.items);
    setUnread(data.unreadCount);
    setLoading(false);
  }

  async function markAllRead() {
    await api.put("/notifications/mark-all-read");
    setItems(items.map(n => ({ ...n, isRead: true })));
    setUnread(0);
  }

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900">Bildirishnomalar</h2>
          {unread > 0 && <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs font-semibold">{unread} yangi</span>}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm">
            <CheckCheck className="w-4 h-4" />Barchasini o'qildi deb belgilash
          </button>
        )}
      </div>

      <div className="space-y-2">
        {items.map((n) => (
          <div key={n.id} className={`bg-white rounded-xl border p-4 flex items-start gap-4 transition-all ${!n.isRead ? "border-brand-200 shadow-sm" : "border-gray-100"}`}>
            <div className={`w-9 h-9 rounded-full ${typeBgs[n.type] || "bg-gray-50"} flex items-center justify-center flex-shrink-0`}>
              {typeIcons[n.type] || <Bell className="w-4 h-4 text-gray-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-semibold ${!n.isRead ? "text-gray-900" : "text-gray-600"}`}>{n.title}</p>
                {!n.isRead && <span className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-1.5" />}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
