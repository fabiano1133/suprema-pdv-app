"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./AuthContext";
import { getRestrictedRedirect, isPathRestricted } from "@/lib/auth";

/**
 * Redireciona PDV-01 das rotas restritas (produtos, pedidos, etiquetas) para /orders.
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!pathname || !user) return;
    if (user === "ADM-01") return;
    if (isPathRestricted(pathname)) {
      router.replace(getRestrictedRedirect());
    }
  }, [pathname, user, router]);

  return <>{children}</>;
}
