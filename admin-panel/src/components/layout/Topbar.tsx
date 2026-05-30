"use client";
import { useState, useEffect } from "react";
import { Bell, Search, ChevronDown } from "lucide-react";
import { User } from "@/types";

interface TopbarProps {
  title: string;
}

export default function Topbar({ title }: TopbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [unread, setUnread] = useState(4);

  useEffect(() => {
    const stored = localStorage.getItem("erp_user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    DIRECTOR: "Direktor",
    SUPERVISOR: "Supervisor",
    SALES_MANAGER: "Savdo Menejeri",
    SALES_AGENT: "Savdo Agenti",
    WAREHOUSE_OPERATOR: "Ombor Operatori",
    ACCOUNTANT: "Buxgalter",
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Qidirish..."
            className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 w-56"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>

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
