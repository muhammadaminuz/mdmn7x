"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Package } from "lucide-react";
import api from "@/lib/api";
import { formatCurrencyFull } from "@/lib/formatters";

const statusMap: Record<string, { label: string; color: string }> = {
  DELIVERED: { label: "Yetkazildi", color: "bg-green-100 text-green-700" },
  APPROVED: { label: "Tasdiqlandi", color: "bg-blue-100 text-blue-700" },
  PENDING: { label: "Kutilmoqda", color: "bg-amber-100 text-amber-700" },
  DRAFT: { label: "Qoralama", color: "bg-gray-100 text-gray-600" },
  CANCELLED: { label: "Bekor qilindi", color: "bg-red-100 text-red-600" },
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    api.get(`/orders/${id}`).then((r) => setOrder(r.data));
  }, [id]);

  if (!order) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;

  const s = statusMap[order.status] || { label: order.status, color: "bg-gray-100 text-gray-600" };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-5 border-b border-gray-100">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-gray-500 mb-4">
          <ChevronLeft className="w-4 h-4" /><span className="text-sm">Orqaga</span>
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{order.orderNo}</h1>
            <p className="text-sm text-gray-400">{order.customerName}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${s.color}`}>{s.label}</span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="mobile-card overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mahsulotlar</div>
          {order.items.map((item: any) => (
            <div key={item.productId} className="px-4 py-3 flex items-center gap-3 border-b border-gray-50 last:border-0">
              <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                <p className="text-xs text-gray-400">{formatCurrencyFull(item.price)} × {item.quantity}</p>
              </div>
              <p className="text-sm font-bold text-gray-900">{formatCurrencyFull(item.total)}</p>
            </div>
          ))}
        </div>

        <div className="mobile-card p-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrencyFull(order.subtotal)}</span></div>
          {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Chegirma</span><span>-{formatCurrencyFull(order.discount)}</span></div>}
          <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100"><span>Jami</span><span className="text-primary-600">{formatCurrencyFull(order.total)}</span></div>
        </div>

        <div className="mobile-card p-4 text-sm space-y-2 text-gray-500">
          <div className="flex justify-between"><span>Sana</span><span className="text-gray-700">{formatDateTime(order.createdAt)}</span></div>
          {order.deliveredAt && <div className="flex justify-between"><span>Yetkazildi</span><span className="text-gray-700">{formatDateTime(order.deliveredAt)}</span></div>}
        </div>
      </div>
    </div>
  );
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
