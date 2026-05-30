"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Search, Plus, Minus, Trash2, ShoppingCart, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { formatCurrencyFull } from "@/lib/formatters";

interface CartItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  total: number;
}

function NewOrderContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState(1);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId] = useState(params.get("customerId") || "");
  const [customerName] = useState(params.get("customerName") || "Mijoz tanlanmagan");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadProducts(); }, [search]);

  async function loadProducts() {
    setLoading(true);
    try {
      const { data } = await api.get("/products", { params: { limit: 30, search } });
      setProducts(data.items);
    } finally { setLoading(false); }
  }

  function addToCart(product: any) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price } : i);
      return [...prev, { productId: product.id, productName: product.name, price: product.wholesalePrice, quantity: 1, total: product.wholesalePrice }];
    });
  }

  function updateQty(productId: number, delta: number) {
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: Math.max(1, i.quantity + delta), total: Math.max(1, i.quantity + delta) * i.price } : i).filter((i) => i.quantity > 0));
  }

  function removeItem(productId: number) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  const subtotal = cart.reduce((s, i) => s + i.total, 0);

  async function submitOrder() {
    if (!customerId) { alert("Avval mijoz tanlang"); return; }
    if (cart.length === 0) { alert("Savatchaga mahsulot qo'shing"); return; }
    setSubmitting(true);
    try {
      const user = JSON.parse(localStorage.getItem("agent_user") || "{}");
      await api.post("/orders", {
        customerId: Number(customerId),
        customerName,
        agentId: user.agent?.id,
        agentName: user.fullName,
        items: cart,
        discount: 0,
      });
      router.replace("/orders");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <button onClick={() => step === 1 ? router.back() : setStep(1)} className="flex items-center gap-1 text-gray-500 mb-3">
          <ChevronLeft className="w-4 h-4" /><span className="text-sm">Orqaga</span>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Yangi Buyurtma</h1>
        <p className="text-sm text-gray-400 mt-0.5">{customerName}</p>
        {/* Steps */}
        <div className="flex items-center gap-2 mt-4">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? "bg-primary-500 text-white" : "bg-gray-200 text-gray-400"}`}>{s}</div>
              {s < 2 && <div className={`flex-1 h-0.5 w-16 ${step > s ? "bg-primary-500" : "bg-gray-200"}`} />}
            </div>
          ))}
          <span className="text-xs text-gray-400 ml-1">{step === 1 ? "Mahsulot tanlash" : "Tasdiqlash"}</span>
        </div>
      </div>

      {step === 1 ? (
        <>
          <div className="px-4 pt-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" placeholder="Mahsulot nomi, SKU..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="px-4 py-3 space-y-2 pb-36">
            {products.map((p) => {
              const cartItem = cart.find((i) => i.productId === p.id);
              return (
                <div key={p.id} className="mobile-card p-3 flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">📦</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.category} · {p.stock} ta qoldi</p>
                    <p className="text-sm font-bold text-primary-600">{formatCurrencyFull(p.wholesalePrice)}</p>
                  </div>
                  {cartItem ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(p.id, -1)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:bg-gray-200">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center font-bold text-sm">{cartItem.quantity}</span>
                      <button onClick={() => updateQty(p.id, 1)} className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center active:bg-primary-600">
                        <Plus className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(p)} className="w-9 h-9 bg-primary-500 rounded-full flex items-center justify-center active:bg-primary-600 flex-shrink-0">
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {cart.length > 0 && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md px-4">
              <button onClick={() => setStep(2)} className="green-btn shadow-lg shadow-primary-500/30">
                <ShoppingCart className="w-5 h-5" />
                Savatcha ({cart.length} ta) · {formatCurrencyFull(subtotal)}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="px-4 py-4 space-y-4 pb-32">
          <div className="mobile-card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-900 text-sm">Mahsulotlar ({cart.length} ta)</div>
            {cart.map((item) => (
              <div key={item.productId} className="px-4 py-3 flex items-center gap-3 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                  <p className="text-xs text-gray-400">{formatCurrencyFull(item.price)} × {item.quantity}</p>
                </div>
                <p className="text-sm font-bold text-gray-900 mr-2">{formatCurrencyFull(item.total)}</p>
                <button onClick={() => removeItem(item.productId)} className="text-red-400 active:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mobile-card p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{formatCurrencyFull(subtotal)}</span></div>
            <div className="flex justify-between text-sm text-gray-400"><span>Chegirma</span><span>0 so'm</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100"><span>Jami</span><span className="text-primary-600">{formatCurrencyFull(subtotal)}</span></div>
          </div>
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md px-4">
            <button onClick={submitOrder} disabled={submitting} className="green-btn shadow-lg shadow-primary-500/30">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {submitting ? "Yuborilmoqda..." : "Buyurtmani yuborish"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>}>
      <NewOrderContent />
    </Suspense>
  );
}
