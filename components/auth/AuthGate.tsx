"use client";

import { useAuth } from "./AuthContext";

/**
 * Renderiza os filhos (Header + main) apenas após o usuário ter sido selecionado no modal.
 * Enquanto user for null, nada é exibido além do UserSelectModal.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, mounted } = useAuth();

  if (!mounted || user === null) return null;

  return <>{children}</>;
}
