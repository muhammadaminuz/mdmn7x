"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, ShoppingCart, Wallet, MoreHorizontal, Plus } from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/home", icon: Home, label: "Bosh sahifa" },
  { href: "/customers", icon: Users, label: "Mijozlar" },
  null, // center FAB placeholder
  { href: "/collections", icon: Wallet, label: "Inkasso" },
  { href: "/more", icon: MoreHorizontal, label: "Ko'proq" },
];

const ORDERS_BADGE = 2;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex items-stretch shadow-lg z-50">
      {navItems.map((item, idx) => {
        if (item === null) {
          return (
            <div key="fab" className="flex-1 flex items-center justify-center -mt-5 relative z-10">
              <Link
                href="/orders/new"
                className="w-14 h-14 bg-primary-500 rounded-full flex items-center justify-center shadow-lg shadow-primary-500/40 active:scale-95 transition-transform"
              >
                <Plus className="w-7 h-7 text-white stroke-[2.5]" />
              </Link>
            </div>
          );
        }

        const { href, icon: Icon, label } = item;
        const isOrders = href === "/orders" || (href === "/collections" && false);
        const isActive = pathname === href || (href !== "/home" && pathname.startsWith(href));

        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "bottom-nav-item flex-1 relative",
              isActive ? "text-primary-600" : "text-gray-400 active:text-gray-600"
            )}
          >
            <div className={clsx("p-1.5 rounded-xl transition-colors relative", isActive && "bg-primary-50")}>
              <Icon className={clsx("w-5 h-5", isActive && "stroke-[2.5]")} />
              {isOrders && ORDERS_BADGE > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1">
                  {ORDERS_BADGE}
                </span>
              )}
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
