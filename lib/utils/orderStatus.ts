/** Exibe o status da comanda em português para o usuário. */
export function formatOrderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    OPEN: "Aberta",
    PAID: "Paga",
    CANCELLED: "Cancelada",
    REFUNDED: "Reembolsada",
    ABERTA: "Aberta",
    FECHADA: "Fechada",
  };
  return map[status] ?? status;
}
