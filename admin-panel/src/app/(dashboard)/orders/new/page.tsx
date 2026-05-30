"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { formatCurrencyFull } from "@/lib/formatters";
import { ArrowLeft, Search, Plus, Minus, Check, X } from "lucide-react";

interface Customer {
  id: number;
  companyName: string;
  ownerName?: string;
  phone?: string;
  district?: string;
  address?: string;
  region?: string;
  balance?: number;
  debt?: number;
  agentId?: number;
  territoryId?: number;
  status?: string;
}

interface Agent {
  id: number;
  fullName: string;
  territoryId?: number;
}

interface Territory {
  id: number;
  name: string;
}

interface Warehouse {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  category?: string;
  price?: number;
  wholesalePrice?: number;
  stock?: number;
  minStock?: number;
  warehouseId?: number;
  warehouseName?: string;
}

interface OrderItemState {
  quantity: number;
  price: number;
  name: string;
  stock: number;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function asArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

export default function NewOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState<"client" | "products">("client");

  // shared data
  const [agents, setAgents] = useState<Agent[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);

  // step 1 data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [agentFilter, setAgentFilter] = useState("");
  const [territoryFilter, setTerritoryFilter] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  // selection
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // step 2 data
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState(0);
  const [orderDate, setOrderDate] = useState(todayStr());
  const [warehouseId, setWarehouseId] = useState(0);
  const [productSearch, setProductSearch] = useState("");
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  const [activeCategory, setActiveCategory] = useState("__all__");
  const [items, setItems] = useState<Record<number, OrderItemState>>({});
  const [note, setNote] = useState("");
  const [discount, setDiscount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // load shared + step 1 data
  useEffect(() => {
    setLoadingCustomers(true);
    api
      .get("/customers", { params: { limit: 200 } })
      .then((r) => setCustomers(asArray<Customer>(r.data)))
      .finally(() => setLoadingCustomers(false));
    api.get("/agents", { params: { limit: 200 } }).then((r) => setAgents(asArray<Agent>(r.data)));
    api.get("/territories").then((r) => setTerritories(asArray<Territory>(r.data)));
  }, []);

  // load products/warehouses when entering products step
  useEffect(() => {
    if (step !== "products" || products.length > 0) return;
    setLoadingProducts(true);
    api
      .get("/products", { params: { limit: 500 } })
      .then((r) => setProducts(asArray<Product>(r.data)))
      .finally(() => setLoadingProducts(false));
    api.get("/warehouses").then((r) => setWarehouses(asArray<Warehouse>(r.data)));
  }, [step, products.length]);

  const agentName = (id?: number) => agents.find((a) => a.id === id)?.fullName || "—";
  const territoryName = (id?: number) => territories.find((t) => t.id === id)?.name || "—";

  // ---------- STEP 1 filtering ----------
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    return customers.filter((c) => {
      if (agentFilter && String(c.agentId) !== agentFilter) return false;
      if (territoryFilter && String(c.territoryId) !== territoryFilter) return false;
      if (q) {
        const hay = `${c.companyName || ""} ${c.ownerName || ""} ${c.phone || ""} ${c.address || ""} ${c.district || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [customers, agentFilter, territoryFilter, customerSearch]);

  function pickCustomer(c: Customer) {
    setSelectedCustomer(c);
    setSelectedAgentId(c.agentId || 0);
    setStep("products");
  }

  // ---------- STEP 2 derived ----------
  const warehouseProducts = useMemo(() => {
    if (!warehouseId) return products;
    return products.filter((p) => Number(p.warehouseId) === warehouseId);
  }, [products, warehouseId]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    warehouseProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [warehouseProducts]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return warehouseProducts.filter((p) => {
      if (activeCategory !== "__all__" && p.category !== activeCategory) return false;
      if (hideOutOfStock && (p.stock || 0) === 0) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [warehouseProducts, activeCategory, hideOutOfStock, productSearch]);

  const { totalQty, subtotal } = useMemo(() => {
    let qty = 0;
    let sum = 0;
    Object.values(items).forEach((it) => {
      qty += it.quantity;
      sum += it.quantity * it.price;
    });
    return { totalQty: qty, subtotal: sum };
  }, [items]);

  const payable = Math.max(0, subtotal - (discount || 0));

  function setQuantity(p: Product, rawQty: number) {
    const maxStock = p.stock ?? Infinity;
    const qty = Math.max(0, Math.min(rawQty, maxStock));
    setItems((prev) => {
      const next = { ...prev };
      if (qty <= 0) {
        delete next[p.id];
      } else {
        next[p.id] = {
          quantity: qty,
          price: p.wholesalePrice ?? p.price ?? 0,
          name: p.name,
          stock: p.stock ?? 0,
        };
      }
      return next;
    });
  }

  function step1(p: Product, delta: number) {
    const current = items[p.id]?.quantity || 0;
    setQuantity(p, current + delta);
  }

  async function handleSave() {
    setError("");
    const orderItems = Object.entries(items)
      .filter(([, v]) => v.quantity > 0)
      .map(([productId, v]) => ({
        productId: Number(productId),
        quantity: v.quantity,
        price: v.price,
        total: v.quantity * v.price,
      }));

    if (!selectedCustomer) {
      setError("Mijoz tanlanmagan");
      return;
    }
    if (!selectedAgentId) {
      setError("Agentni tanlang");
      return;
    }
    if (orderItems.length === 0) {
      setError("Kamida bitta mahsulot tanlang");
      return;
    }

    setSaving(true);
    try {
      await api.post("/orders", {
        customerId: selectedCustomer.id,
        agentId: selectedAgentId,
        discount: discount || 0,
        note,
        items: orderItems,
      });
      router.push("/orders");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Buyurtmani saqlashda xatolik yuz berdi");
      setSaving(false);
    }
  }

  // ============================ STEP 1 ============================
  if (step === "client") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/orders")}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
              title="Orqaga"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Mijozni tanlang</h2>
              <p className="text-sm text-gray-500 mt-0.5">Buyurtma uchun mijozni tanlang</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-wrap items-center gap-2">
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Barcha agentlar</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName}
              </option>
            ))}
          </select>
          <select
            value={territoryFilter}
            onChange={(e) => setTerritoryFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Barcha hududlar</option>
            {territories.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Mijoz nomi, telefon, manzil..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <span className="text-sm text-gray-500 ml-auto">{filteredCustomers.length} ta mijoz</span>
        </div>

        {/* Customers table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loadingCustomers ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
              <table className="w-full data-table">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th>ID</th>
                    <th>Mijoz</th>
                    <th>Telefon</th>
                    <th>Agent</th>
                    <th>Hudud</th>
                    <th>Manzil</th>
                    <th className="text-right">Balans</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c) => {
                    const bal = c.balance ?? 0;
                    return (
                      <tr key={c.id}>
                        <td className="text-gray-500">{c.id}</td>
                        <td>
                          <div className="font-medium text-gray-900">{c.companyName}</div>
                          {c.ownerName && <div className="text-xs text-gray-500">{c.ownerName}</div>}
                        </td>
                        <td className="text-gray-600">{c.phone || "—"}</td>
                        <td className="text-gray-600">{agentName(c.agentId)}</td>
                        <td className="text-gray-600">{c.district || territoryName(c.territoryId)}</td>
                        <td className="text-gray-500 max-w-[200px] truncate" title={c.address}>
                          {c.address || "—"}
                        </td>
                        <td className={`text-right font-semibold ${bal < 0 ? "text-red-600" : "text-gray-900"}`}>
                          {formatCurrencyFull(bal)}
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => pickCustomer(c)}
                            className="btn-primary py-1.5 px-3 inline-flex"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Tanlang
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-gray-400">
                        Mijoz topilmadi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================ STEP 2 ============================
  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Left: customer */}
          <div>
            <div className="text-lg font-bold text-gray-900">{selectedCustomer?.companyName}</div>
            <div className="text-sm text-gray-500 mt-0.5">
              {selectedCustomer?.phone || "—"}
              {selectedCustomer?.district ? ` · ${selectedCustomer.district}` : ""}
            </div>
            <button
              onClick={() => setStep("client")}
              className="mt-2 text-sm text-brand-600 hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Mijozni o'zgartirish
            </button>
          </div>

          {/* Center: date + agent */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Buyurtma sanasi</label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Agent</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value={0}>— Tanlang —</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: total */}
          <div className="lg:text-right">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Jami</div>
            <div className="text-2xl font-extrabold text-brand-600">{formatCurrencyFull(payable)}</div>
          </div>
        </div>
      </div>

      {/* Warehouse + search + hide */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-wrap items-center gap-3">
        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value={0}>Barcha omborlar</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Mahsulot qidirish..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideOutOfStock}
            onChange={(e) => setHideOutOfStock(e.target.checked)}
            className="rounded border-gray-300"
          />
          Qoldig'i yo'q mahsulotlarni yashirish
        </label>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveCategory("__all__")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeCategory === "__all__"
              ? "bg-brand-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          Barchasi
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? "bg-brand-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Running totals bar */}
      <div className="sticky top-0 z-20 bg-brand-50 border border-brand-200 rounded-lg px-4 py-2.5 flex items-center gap-6 text-sm">
        <span className="text-brand-700">
          Jami miqdor: <b>{totalQty}</b> dona
        </span>
        <span className="text-brand-700">
          Buyurtma summasi: <b>{formatCurrencyFull(subtotal)}</b>
        </span>
      </div>

      {/* Product table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loadingProducts ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-360px)] overflow-y-auto">
            <table className="w-full data-table">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="w-10">#</th>
                  <th>Mahsulot nomi</th>
                  <th className="text-right">Narx</th>
                  <th className="text-center">Qoldiq</th>
                  <th className="text-center w-44">Miqdor</th>
                  <th className="text-right">Summa</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p, idx) => {
                  const price = p.wholesalePrice ?? p.price ?? 0;
                  const qty = items[p.id]?.quantity || 0;
                  const stock = p.stock ?? 0;
                  const lineSum = qty * price;
                  const stockClass =
                    stock === 0
                      ? "text-red-600"
                      : p.minStock != null && stock <= p.minStock
                      ? "text-orange-500"
                      : "text-gray-700";
                  return (
                    <tr key={p.id} className={qty > 0 ? "bg-brand-50" : ""}>
                      <td className="text-gray-400">{idx + 1}</td>
                      <td>
                        <div className="font-medium text-gray-900">{p.name}</div>
                        {p.category && <div className="text-xs text-gray-400">{p.category}</div>}
                      </td>
                      <td className="text-right text-gray-700">{formatCurrencyFull(price)}</td>
                      <td className={`text-center font-medium ${stockClass}`}>{stock}</td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => step1(p, -1)}
                            disabled={qty <= 0}
                            className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={stock}
                            value={qty || ""}
                            onChange={(e) => setQuantity(p, Number(e.target.value))}
                            className="w-16 text-center border border-gray-200 rounded px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                          <button
                            onClick={() => step1(p, 1)}
                            disabled={qty >= stock}
                            className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="text-right font-semibold text-gray-900">
                        {lineSum > 0 ? formatCurrencyFull(lineSum) : "—"}
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">
                      Mahsulot topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Izoh</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Ixtiyoriy izoh..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chegirma (so'm)</label>
            <input
              type="number"
              min={0}
              value={discount || ""}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Jami:</span>
              <span>{formatCurrencyFull(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Chegirma:</span>
                <span>-{formatCurrencyFull(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>TO'LOV SUMMASI:</span>
              <span>{formatCurrencyFull(payable)}</span>
            </div>
          </div>

          {error && (
            <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <X className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="mt-auto pt-4 flex items-center justify-end gap-3">
            <button onClick={() => router.back()} className="btn-secondary">
              Bekor qilish
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
              <Check className="w-4 h-4" />
              {saving ? "Saqlanmoqda..." : "Buyurtmani saqlash"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
