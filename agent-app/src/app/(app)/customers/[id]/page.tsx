"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Phone, MapPin, ShoppingCart, CreditCard, AlertCircle } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { formatCurrencyFull, formatDate } from "@/lib/formatters";
import { Badge } from "@/components/ui/StatusPill";

export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/customers/${id}`).then((r) => { setCustomer(r.data); setLoading(false); });
  }, [id]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  if (!customer) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-5 border-b border-gray-100">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-gray-500 mb-4">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">Orqaga</span>
        </button>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-primary-700">
            {customer.companyName.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{customer.companyName}</h1>
            <p className="text-sm text-gray-400">{customer.ownerName}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${customer.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {customer.status === "ACTIVE" ? "Faol" : "Nofaol"}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Contact info */}
        <div className="mobile-card p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">Aloqa ma'lumotlari</h3>
          {[
            { icon: Phone, label: customer.phone },
            { icon: MapPin, label: `${customer.district}, ${customer.address}` },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center">
                <Icon className="w-4 h-4 text-gray-400" />
              </div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-2 gap-3">
          {customer.debt > 0 && (
            <div className="mobile-card p-4 border-red-100 bg-red-50">
              <div className="flex items-center gap-1 text-red-500 mb-1">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-medium">Qarzi</span>
              </div>
              <div className="text-lg font-bold text-red-600">{formatCurrencyFull(customer.debt)}</div>
            </div>
          )}
          {customer.balance > 0 && (
            <div className="mobile-card p-4 border-primary-100 bg-primary-50">
              <div className="text-xs font-medium text-primary-600 mb-1">Balansi</div>
              <div className="text-lg font-bold text-primary-600">{formatCurrencyFull(customer.balance)}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/orders/new?customerId=${customer.id}&customerName=${encodeURIComponent(customer.companyName)}`} className="mobile-card p-4 flex flex-col items-center gap-2 active:scale-95">
            <div className="w-11 h-11 bg-primary-500 rounded-2xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700">Buyurtma</span>
          </Link>
          <Link href={`/collections?customerId=${customer.id}`} className="mobile-card p-4 flex flex-col items-center gap-2 active:scale-95">
            <div className="w-11 h-11 bg-blue-500 rounded-2xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700">To'lov qabul</span>
          </Link>
        </div>

        {/* Recent Orders */}
        {customer.orders?.length > 0 && (
          <div className="mobile-card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-900 text-sm">So'nggi buyurtmalar</div>
            {customer.orders.slice(0, 5).map((o: any) => (
              <div key={o.id} className="px-4 py-3 border-b border-gray-50 flex items-center justify-between last:border-0">
                <div>
                  <div className="text-sm font-medium text-gray-900">{o.orderNo}</div>
                  <div className="text-xs text-gray-400">{formatDate(o.createdAt)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">{formatCurrencyFull(o.total)}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${o.status === "DELIVERED" ? "bg-green-100 text-green-700" : o.status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                    {o.status === "DELIVERED" ? "Yetkazildi" : o.status === "PENDING" ? "Kutilmoqda" : o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
