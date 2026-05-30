"use client";
import { useEffect, useState, useRef } from "react";
import { RefreshCw, Navigation } from "lucide-react";
import api from "@/lib/api";
import { timeAgo } from "@/lib/formatters";

interface AgentLocation {
  id: number;
  fullName: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  lastSeen: string | null;
  territoryName: string;
  isOnline: boolean;
}

export default function GpsPage() {
  const [agents, setAgents] = useState<AgentLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentLocation | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    loadAgents();
    const interval = setInterval(() => {
      loadAgents();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      initMap();
    }
  }, []);

  useEffect(() => {
    if (mapRef.current && agents.length > 0) {
      updateMarkers();
    }
  }, [agents]);

  async function loadAgents() {
    try {
      const { data } = await api.get("/gps/agents");
      setAgents(data.items ?? []);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }

  async function initMap() {
    if (!mapContainerRef.current || mapRef.current) return;
    const L = (await import("leaflet")).default;
    // Load leaflet CSS dynamically
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Fix default icon issue with webpack
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    mapRef.current = L.map(mapContainerRef.current).setView([41.2995, 69.2401], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapRef.current);
  }

  async function updateMarkers() {
    if (!mapRef.current) return;
    const L = (await import("leaflet")).default;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    agents.forEach((agent) => {
      if (!agent.latitude || !agent.longitude) return;

      const color = agent.isOnline ? "#22c55e" : "#94a3b8";
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;color:white;">${agent.fullName.charAt(0)}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([agent.latitude, agent.longitude], { icon })
        .addTo(mapRef.current)
        .bindPopup(`
          <div style="font-family:sans-serif;min-width:160px;">
            <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${agent.fullName}</div>
            <div style="color:#64748b;font-size:12px;">${agent.territoryName}</div>
            <div style="color:#64748b;font-size:12px;">${agent.phone}</div>
            <div style="margin-top:6px;padding-top:6px;border-top:1px solid #e2e8f0;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:4px;"></span>
              <span style="font-size:12px;color:${color};">${agent.isOnline ? "Online" : "Offline"}</span>
            </div>
            ${agent.lastSeen ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;">${new Date(agent.lastSeen).toLocaleString("uz-UZ")}</div>` : ""}
          </div>
        `);

      markersRef.current.push(marker);
    });
  }

  function focusAgent(agent: AgentLocation) {
    setSelectedAgent(agent);
    if (mapRef.current && agent.latitude && agent.longitude) {
      mapRef.current.setView([agent.latitude, agent.longitude], 15);
      const markerIdx = agents.filter((a) => a.latitude && a.longitude).findIndex((a) => a.id === agent.id);
      if (markersRef.current[markerIdx]) {
        markersRef.current[markerIdx].openPopup();
      }
    }
  }

  const onlineCount = agents.filter((a) => a.isOnline).length;

  return (
    <div className="space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">GPS Xarita</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {onlineCount} ta faol agent • Yangilangan: {lastRefresh.toLocaleTimeString("uz-UZ")}
          </p>
        </div>
        <button onClick={loadAgents} disabled={loading} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Yangilash
        </button>
      </div>

      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-96">
        {/* Agent Sidebar */}
        <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Agentlar</h3>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => focusAgent(agent)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${selectedAgent?.id === agent.id ? "bg-brand-50" : ""}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {agent.fullName.charAt(0)}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${agent.isOnline ? "bg-green-500" : "bg-gray-300"}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{agent.fullName}</div>
                    <div className="text-xs text-gray-400 truncate">{agent.territoryName}</div>
                    {agent.lastSeen && (
                      <div className="text-xs text-gray-400">{timeAgo(agent.lastSeen)}</div>
                    )}
                  </div>
                </div>
                {!agent.latitude && (
                  <div className="mt-1.5 text-xs text-amber-500 flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    Joylashuv yo'q
                  </div>
                )}
              </button>
            ))}
            {agents.length === 0 && !loading && (
              <p className="text-center text-gray-400 text-sm py-8">Agentlar yo'q</p>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden relative">
          <div ref={mapContainerRef} className="w-full h-full" />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
            </div>
          )}
          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-white rounded-xl border border-gray-200 shadow-md px-3 py-2 text-xs space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-600">Online (&lt;15 daqiqa)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="text-gray-600">Offline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
