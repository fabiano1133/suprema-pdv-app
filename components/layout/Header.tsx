"use client";

import Link from "next/link";
import { ShoppingCart, Package, ClipboardCheck, PackageSearch, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth";
import { canSeeNavItem } from "@/lib/auth";

const navItems = [
  { href: "/orders", label: "Comandas", icon: ShoppingCart },
  { href: "/stock-entries", label: "Pedidos", icon: Package },
  { href: "/stock-counts", label: "Conferência", icon: ClipboardCheck },
  { href: "/products", label: "Produtos", icon: PackageSearch },
];

export function Header() {
  const { user, setUser } = useAuth();
  const visibleItems = navItems.filter((item) => canSeeNavItem(item.href, user));

  const handleLogout = () => setUser(null);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4">
        <Link href="/orders" className="flex shrink-0 items-center gap-2 text-lg font-semibold text-slate-800">
          <img src="/pdv.svg" alt="" className="h-7 w-7" aria-hidden />
          Suprema PDV
        </Link>
        <nav className="flex flex-1 items-center justify-end gap-2">
          {visibleItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sair
          </button>
        </nav>
      </div>
    </header>
  );
}
