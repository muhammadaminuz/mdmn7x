"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/layout/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("agent_token");
    if (!token) router.replace("/login");
    setMounted(true);
  }, [router]);

  if (!mounted) return (
    <div className="min-h-screen flex items-center justify-center bg-primary-500">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent" />
    </div>
  );

  return (
    <div className="page-container bg-gray-50">
      <div className="pb-20">{children}</div>
      <BottomNav />
    </div>
  );
}
