/**
 * Controle de permissões no frontend (temporário até o backend ter auth).
 * PDV-01: apenas vendas/comandas.
 * ADM-01: acesso total.
 */

export type UserRole = "PDV-01" | "ADM-01";

export const AUTH_STORAGE_KEY = "pdv-user";

export const VALID_USER_ROLES: UserRole[] = ["PDV-01", "ADM-01"];

/** Formata o valor digitado para maiúsculas (aceita minúsculas). */
export function formatUserInput(value: string): string {
  return value.trim().toUpperCase();
}

/** Retorna o role válido ou null se inválido. */
export function parseUserRole(input: string): UserRole | null {
  const normalized = formatUserInput(input);
  return VALID_USER_ROLES.includes(normalized as UserRole) ? (normalized as UserRole) : null;
}

/** Rotas que apenas ADM-01 pode acessar. PDV-01 é redirecionado para /orders. */
const ADM_ONLY_PATHS = ["/products", "/stock-entries", "/stock-counts", "/labels"];

export function canAccessPath(pathname: string, user: UserRole | null): boolean {
  if (!user) return true; // ainda não escolheu usuário; deixa passar e o Header mostra o seletor
  if (user === "ADM-01") return true;
  // PDV-01: só comandas (orders) e resumo
  const isRestricted = ADM_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  return !isRestricted;
}

export function getRestrictedRedirect(): string {
  return "/orders";
}

export function isPathRestricted(pathname: string): boolean {
  return ADM_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function canSeeNavItem(href: string, user: UserRole | null): boolean {
  if (!user) return true;
  if (user === "ADM-01") return true;
  // PDV-01: só Comandas
  return href === "/orders" || href.startsWith("/orders");
}
