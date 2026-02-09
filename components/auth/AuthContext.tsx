"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AUTH_STORAGE_KEY, canAccessPath, type UserRole } from "@/lib/auth";

interface AuthContextValue {
  user: UserRole | null;
  mounted: boolean;
  setUser: (user: UserRole | null) => void;
  canAccessPath: (pathname: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredUser(): UserRole | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw === "PDV-01" || raw === "ADM-01") return raw;
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<UserRole | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUserState(getStoredUser());
    setMounted(true);
  }, []);

  const setUser = useCallback((value: UserRole | null) => {
    setUserState(value);
    if (typeof window !== "undefined") {
      if (value) localStorage.setItem(AUTH_STORAGE_KEY, value);
      else localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const canAccess = useCallback(
    (pathname: string) => canAccessPath(pathname, user),
    [user]
  );

  const value: AuthContextValue = {
    user,
    mounted,
    setUser,
    canAccessPath: mounted ? canAccess : () => true,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
