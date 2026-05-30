"use client";
import { useEffect, useState } from "react";
import { MapPin, CheckCircle2, Clock, Navigation, ChevronRight } from "lucide-react";
import api from "@/lib/api";

export default function RoutePlanPage() {
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/route-stops/today").then((r) => { setRoute(r.data); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-5 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Bugungi Marshrut</h1>
        <p className="text-sm text-gray-400 mt-0.5">{new Date().toLocaleDateString("uz-UZ", { weekday: "long", day: "2-digit", month: "long" })}</p>
      </div>

      {/* Progress */}
      <div className="bg-primary-500 px-4 py-5">
        <div className="flex items-center justify-between mb-2 text-white">
          <span className="text-sm font-medium">Marshrut bajarilishi</span>
          <span className="text-lg font-bold">{route.completion}%</span>
        </div>
        <div className="w-full bg-white/30 rounded-full h-3 mb-3">
          <div className="bg-white h-3 rounded-full transition-all" style={{ width: `${route.completion}%` }} />
        </div>
        <div className="flex items-center justify-between text-primary-100 text-sm">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />{route.visited} ta bajarildi</span>
          <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{route.pending} ta qoldi</span>
        </div>
      </div>

      {/* Stops list */}
      <div className="px-4 py-4 space-y-3">
        {route.stops?.sort((a: any, b: any) => a.order - b.order).map((stop: any, idx: number) => (
          <div key={stop.id} className={`mobile-card p-4 ${stop.status === "VISITED" ? "opacity-70" : ""}`}>
            <div className="flex items-start gap-3">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${stop.status === "VISITED" ? "bg-primary-500 text-white" : stop.status === "SKIPPED" ? "bg-gray-200 text-gray-400" : "bg-amber-100 text-amber-700 border-2 border-amber-300"}`}>
                  {stop.status === "VISITED" ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                {idx < route.stops.length - 1 && <div className="w-0.5 h-6 bg-gray-200 mt-1" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900">{stop.customerName}</h3>
                  <span className="text-xs text-gray-400">{stop.plannedTime.slice(11, 16)}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                  <MapPin className="w-3 h-3" />{stop.address}
                </div>
                {stop.status === "VISITED" && (
                  <div className="flex items-center gap-3 text-xs">
                    {stop.orderId && <span className="text-primary-600 font-medium">✓ Buyurtma qabul qilindi</span>}
                    {stop.collectionAmount > 0 && <span className="text-green-600 font-medium">✓ {(stop.collectionAmount / 1000).toFixed(0)}K so'm yig'ildi</span>}
                  </div>
                )}
                {stop.status === "PENDING" && (
                  <div className="flex items-center gap-2 mt-2">
                    <a
                      href={`https://maps.google.com/?q=${stop.latitude},${stop.longitude}`}
                      target="_blank"
                      className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-medium"
                    >
                      <Navigation className="w-3 h-3" />Yo'nalish
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
