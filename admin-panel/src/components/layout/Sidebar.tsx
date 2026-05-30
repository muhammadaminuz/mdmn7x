"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard, ShoppingCart, Users, Package, Warehouse, BoxesIcon,
  UserCheck, MapPin, CreditCard, BarChart3, TrendingUp, HeartHandshake,
  Bell, Settings, Package2, ChevronLeft, LogOut
} from "lucide-react";

const navGroups = [
  {
    label: "Asosiy",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Buyurtmalar", href: "/orders", icon: ShoppingCart, badge: 3 },
      { label: "Mijozlar", href: "/customers", icon: Users },
    ],
  },
  {
    label: "Ombor",
    items: [
      { label: "Mahsulotlar", href: "/products", icon: Package },
      { label: "Omborlar", href: "/warehouses", icon: Warehouse },
      { label: "Inventar", href: "/inventory", icon: BoxesIcon },
    ],
  },
  {
    label: "Savdo",
    items: [
      { label: "Agentlar", href: "/agents", icon: UserCheck },
      { label: "Hududlar", href: "/territories", icon: MapPin },
      { label: "To'lovlar", href: "/payments", icon: CreditCard },
    ],
  },
  {
    label: "Tahlil",
    items: [
      { label: "Hisobotlar", href: "/reports", icon: BarChart3 },
      { label: "Analitika", href: "/analytics", icon: TrendingUp },
      { label: "CRM", href: "/crm", icon: HeartHandshake },
    ],
  },
  {
    label: "Tizim",
    items: [
      { label: "Bildirishnomalar", href: "/notifications", icon: Bell, badge: 4 },
      { label: "Sozlamalar", href: "/settings", icon: Settings },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  function handleLogout() {
    localStorage.removeItem("erp_token");
    localStorage.removeItem("erp_user");
    window.location.href = "/login";
  }

  return (
    <aside className={clsx(
      "h-screen flex flex-col bg-slate-900 border-r border-slate-700/50 transition-all duration-300 flex-shrink-0",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700/50 h-16">
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
              <Package2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white truncate">DistributionERP</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center mx-auto">
            <Package2 className="w-4 h-4 text-white" />
          </div>
        )}
        {!collapsed && (
          <button onClick={onToggle} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors flex-shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-3 mb-1">
                <span className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">{group.label}</span>
              </div>
            )}
            {collapsed && <div className="border-t border-slate-700/40 my-2" />}
            <div className="space-y-0.5">
              {group.items.map(({ label, href, icon: Icon, badge }) => {
                const isActive = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    className={clsx(
                      "sidebar-item group relative",
                      isActive ? "sidebar-item-active" : "sidebar-item-inactive",
                      collapsed ? "justify-center px-2" : ""
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span className="truncate flex-1">{label}</span>}
                    {badge && badge > 0 && (
                      <span className={clsx(
                        "flex-shrink-0 text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none",
                        isActive ? "bg-white/20 text-white" : "bg-red-500 text-white",
                        collapsed ? "absolute top-1 right-1 w-4 h-4 flex items-center justify-center px-0" : ""
                      )}>
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-slate-700/50">
        {collapsed && (
          <button onClick={onToggle} className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors mb-1">
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        )}
        <button
          onClick={handleLogout}
          className={clsx(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors",
            collapsed ? "justify-center" : ""
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Chiqish</span>}
        </button>
      </div>
    </aside>
  );
}
