"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/orders": "Buyurtmalar",
  "/customers": "Mijozlar",
  "/products": "Mahsulotlar",
  "/warehouses": "Omborlar",
  "/inventory": "Inventar",
  "/agents": "Agentlar",
  "/territories": "Hududlar",
  "/payments": "To'lovlar",
  "/reports": "Hisobotlar",
  "/analytics": "Analitika",
  "/crm": "CRM",
  "/notifications": "Bildirishnomalar",
  "/settings": "Sozlamalar",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("erp_token");
    if (!token) router.replace("/login");
    const savedCollapsed = localStorage.getItem("sidebar_collapsed");
    if (savedCollapsed) setCollapsed(savedCollapsed === "true");
    setMounted(true);
  }, [router]);

  function toggleSidebar() {
    const newVal = !collapsed;
    setCollapsed(newVal);
    localStorage.setItem("sidebar_collapsed", String(newVal));
  }

  const basePath = "/" + pathname.split("/")[1];
  const title = pageTitles[basePath] || "DistributionERP";

  if (!mounted) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
