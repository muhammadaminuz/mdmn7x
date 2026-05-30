"use client";
import { useEffect, useState } from "react";
import { Warehouse as WarehouseIcon, Package, AlertCircle, Phone, MapPin } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/formatters";
import { Warehouse } from "@/types";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/warehouses").then((r) => { setWarehouses(r.data); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Omborlar</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {warehouses.map((wh) => (
          <div key={wh.id} className={`bg-white rounded-xl border p-5 shadow-sm ${!wh.isActive ? "opacity-60 border-gray-200" : "border-gray-100 hover:shadow-md"} transition-shadow`}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                <WarehouseIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <span className={`status-badge ${wh.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {wh.isActive ? "Faol" : "Yopiq"}
              </span>
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">{wh.name}</h3>
            <div className="space-y-2 text-sm text-gray-500 mb-4">
              <div className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{wh.location}</span></div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4" /><span>{wh.phone}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Mahsulot turlari</div>
                <div className="text-lg font-bold text-gray-900 flex items-center gap-1">
                  <Package className="w-4 h-4 text-gray-400" />
                  {wh.totalProducts}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Umumiy qiymat</div>
                <div className="text-sm font-bold text-brand-600">{formatCurrency(wh.totalValue)} so'm</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
              Mas'ul: <span className="font-medium text-gray-700">{wh.manager}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
