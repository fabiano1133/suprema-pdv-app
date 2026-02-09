import { redirect } from "next/navigation";

/**
 * Página principal (home): apenas redireciona para a lista de comandas.
 * O conteúdo principal da aplicação está em /orders e usa componentes
 * (OrdersPageClient, OrderFilters, OrderList, etc.).
 */
export default function HomePage() {
  redirect("/orders");
}
