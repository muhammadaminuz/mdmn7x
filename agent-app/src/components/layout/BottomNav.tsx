"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, ShoppingCart, Wallet, MoreHorizontal } from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/home", icon: Home, label: "Bosh sahifa" },
  { href: "/customers", icon: Users, label: "Mijozlar" },
  { href: "/orders", icon: ShoppingCart, label: "Buyurtmalar" },
  { href: "/collections", icon: Wallet, label: "Inkasso" },
  { href: "/more", icon: MoreHorizontal, label: "Ko'proq" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex items-stretch shadow-lg z-50">
      {navItems.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href || (href !== "/home" && pathname.startsWith(href));
        return (
          <Link key={href} href={href} className={clsx(
            "bottom-nav-item",
            isActive ? "text-primary-600" : "text-gray-400 active:text-gray-600"
          )}>
            <div className={clsx("p-1.5 rounded-xl transition-colors", isActive && "bg-primary-50")}>
              <Icon className={clsx("w-5 h-5", isActive && "stroke-[2.5]")} />
            </div>
            <span className={clsx("text-[10px] font-medium", isActive ? "text-primary-600" : "text-gray-400")}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
