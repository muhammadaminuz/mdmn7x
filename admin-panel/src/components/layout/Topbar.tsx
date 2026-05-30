"use client";
import { useState, useEffect, useRef } from "react";
import { Bell, Search, ChevronDown, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { User } from "@/types";
import api from "@/lib/api";

interface TopbarProps {
  title: string;
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  DIRECTOR: "Direktor",
  SUPERVISOR: "Supervisor",
  SALES_MANAGER: "Savdo Menejeri",
  SALES_AGENT: "Savdo Agenti",
  WAREHOUSE_OPERATOR: "Ombor Operatori",
  ACCOUNTANT: "Buxgalter",
};

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function Topbar({ title }: TopbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [unread, setUnread] = useState(4);
  const [search, setSearch] = useState("");
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const now = useClock();
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("erp_user");
    if (stored) setUser(JSON.parse(stored));
    api.get("/notifications").then((r) => {
      setNotifications(r.data.slice(0, 5));
      setUnread(r.data.filter((n: any) => !n.isRead).length);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) router.push(`/orders?search=${encodeURIComponent(search.trim())}`);
  }

  const dateStr = now.toLocaleDateString("uz-UZ", { weekday: "short", day: "2-digit", month: "short" });
  const timeStr = now.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Date/time pill */}
        <div className="hidden lg:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-500">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span>{dateStr}</span>
          <span className="text-gray-300">|</span>
          <span className="font-medium text-gray-700">{timeStr}</span>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buyurtma, mijoz..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 w-52"
          />
        </form>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifDropdown((v) => !v)}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1 leading-none">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          {showNotifDropdown && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="font-semibold text-gray-900 text-sm">Bildirishnomalar</span>
                <span className="text-xs text-brand-600 cursor-pointer hover:underline">Barchasini o'qi</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className={`px-4 py-3 border-b border-gray-50 last:border-0 ${!n.isRead ? "bg-brand-50/40" : ""}`}>
                    <div className="text-sm font-medium text-gray-900">{n.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{n.message}</div>
                  </div>
                ))}
              </div>
              <a href="/notifications" className="block px-4 py-2.5 text-xs text-center text-brand-600 hover:bg-gray-50 transition-colors">
                Barchasi →
              </a>
            </div>
          )}
        </div>

        {/* User */}
        <button className="flex items-center gap-2.5 hover:bg-gray-50 rounded-lg px-3 py-1.5 transition-colors">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-semibold">
            {user?.fullName?.charAt(0) || "A"}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-sm font-medium text-gray-900 leading-tight">{user?.fullName || "Foydalanuvchi"}</div>
            <div className="text-xs text-gray-500">{user?.role ? roleLabels[user.role] : ""}</div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
        </button>
      </div>
    </header>
  );
}
