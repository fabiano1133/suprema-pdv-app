/**
 * Formata número para moeda BR (apenas front).
 * Ex.: 13.9 -> "13,90" | 1299.9 -> "1.299,90"
 */
export function toBrCurrency(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return "";
  const n = Number(value);
  const [intPart, decPart] = n.toFixed(2).split(".");
  const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart != null ? `${intWithDots},${decPart}` : intWithDots;
}

/**
 * Parse string em formato BR para número (envio ao backend).
 * Ex.: "13,90" -> 13.9 | "1.299,90" -> 1299.9 | "" -> 0
 */
export function fromBrCurrency(value: string): number {
  if (!value || typeof value !== "string") return 0;
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(normalized);
  return Number.isNaN(n) ? 0 : n;
}
