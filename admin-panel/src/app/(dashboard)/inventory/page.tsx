"use client";
import { useEffect, useState } from "react";
import { AlertCircle, Search } from "lucide-react";
import api from "@/lib/api";
import { Product } from "@/types";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [lowStockOnly]);

  async function load() {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (lowStockOnly) params.lowStock = "true";
      if (search) params.search = search;
      const { data } = await api.get("/products", { params });
      setProducts(data.items);
    } finally { setLoading(false); }
  }

  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Inventar</h2>
          {lowStockCount > 0 && (
            <p className="text-sm text-red-500 mt-0.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {lowStockCount} ta mahsulot kam qoldi
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Mahsulot nomi yoki SKU..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${lowStockOnly ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          <AlertCircle className="w-4 h-4" />
          Kam qoldiqlар
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>
        ) : (
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Mahsulot</th>
                <th>Kategoriya</th>
                <th>Ombordagi miqdor</th>
                <th>Min. miqdor</th>
                <th>Holat</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const pct = Math.min((p.stock / Math.max(p.minStock * 3, 1)) * 100, 100);
                const isLow = p.stock <= p.minStock;
                return (
                  <tr key={p.id}>
                    <td className="font-mono text-xs text-gray-400">{p.sku}</td>
                    <td className="font-medium text-gray-900">{p.name}</td>
                    <td><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{p.category}</span></td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-100 rounded-full h-2">
                          <div className={`h-2 rounded-full ${isLow ? "bg-red-500" : pct > 60 ? "bg-green-500" : "bg-amber-400"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`font-bold text-sm ${isLow ? "text-red-600" : "text-gray-900"}`}>{p.stock}</span>
                      </div>
                    </td>
                    <td className="text-gray-500">{p.minStock}</td>
                    <td>
                      {isLow ? (
                        <span className="status-badge bg-red-100 text-red-700 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Kam
                        </span>
                      ) : (
                        <span className="status-badge bg-green-100 text-green-700">Yetarli</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
