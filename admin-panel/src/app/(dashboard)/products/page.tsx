"use client";
import { useEffect, useState } from "react";
import { Plus, Search, AlertCircle, Package } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/formatters";
import { Product } from "@/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/products/categories").then((r) => setCategories(r.data));
    loadProducts();
  }, [category]);

  async function loadProducts() {
    setLoading(true);
    try {
      const params: any = { limit: 30 };
      if (category) params.category = category;
      if (search) params.search = search;
      const { data } = await api.get("/products", { params });
      setProducts(data.items);
      setTotal(data.total);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Mahsulotlar</h2>
          <p className="text-sm text-gray-500 mt-0.5">Jami {total} ta mahsulot</p>
        </div>
        <button className="btn-primary"><Plus className="w-4 h-4" />Yangi mahsulot</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Nomi, SKU, barkod..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadProducts()}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCategory("")} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${category === "" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            Barchasi
          </button>
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${category === c ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Mahsulot nomi</th>
                <th>Kategoriya</th>
                <th>Narx (chakana)</th>
                <th>Narx (ulgurji)</th>
                <th>Omborda</th>
                <th>Holat</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs text-gray-500">{p.sku}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="w-4 h-4 text-gray-400" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-400">{p.barcode}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">{p.category}</span></td>
                  <td className="font-medium">{formatCurrency(p.price)} so'm</td>
                  <td className="text-gray-500">{formatCurrency(p.wholesalePrice)} so'm</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${p.stock <= p.minStock ? "text-red-600" : "text-gray-900"}`}>{p.stock}</span>
                      {p.stock <= p.minStock && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                    </div>
                    {p.stock <= p.minStock && <div className="text-xs text-red-500">Min: {p.minStock}</div>}
                  </td>
                  <td>
                    <span className={`status-badge ${p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {p.isActive ? "Faol" : "Nofaol"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
