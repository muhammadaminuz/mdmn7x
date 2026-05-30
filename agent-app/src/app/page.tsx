"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem("agent_token");
    router.replace(token ? "/home" : "/login");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-500">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent" />
    </div>
  );
}
