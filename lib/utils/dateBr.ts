/**
 * Formata string ISO para data/hora em pt-BR (short).
 */
export function formatDateBr(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}
