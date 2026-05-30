"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, AlertCircle, BarChart3, User, LogOut, ChevronRight } from "lucide-react";

const menuItems = [
  { href: "/route-plan", label: "Marshrut rejasi", icon: MapPin, color: "bg-blue-50 text-blue-600", desc: "Bugungi tashriflar" },
  { href: "/debts", label: "Qarzlar", icon: AlertCircle, color: "bg-red-50 text-red-600", desc: "Mijozlar qarzdorligi" },
  { href: "/reports", label: "Hisobotlarim", icon: BarChart3, color: "bg-purple-50 text-purple-600", desc: "Samaradorlik va statistika" },
  { href: "/profile", label: "Profil", icon: User, color: "bg-gray-100 text-gray-600", desc: "Shaxsiy ma'lumotlar" },
];

export default function MorePage() {
  const router = useRouter();

  function logout() {
    localStorage.removeItem("agent_token");
    localStorage.removeItem("agent_user");
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Ko'proq</h1>
      </div>
      <div className="px-4 py-4 space-y-3">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href} className="mobile-card p-4 flex items-center gap-4 active:scale-98 transition-transform">
            <div className={`w-11 h-11 rounded-2xl ${item.color} flex items-center justify-center flex-shrink-0`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-400">{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </Link>
        ))}
        <button onClick={logout} className="w-full mobile-card p-4 flex items-center gap-4 active:scale-98 transition-transform">
          <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
            <LogOut className="w-5 h-5" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-red-600">Chiqish</p>
            <p className="text-xs text-gray-400">Hisobdan chiqish</p>
          </div>
        </button>
      </div>
    </div>
  );
}
