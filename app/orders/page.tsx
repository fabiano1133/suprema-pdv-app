import { fetchOrders } from "@/lib/api/orders";
import { OrdersPageClient } from "@/components/orders";

export default async function OrdersPage() {
  let initialOrders: Awaited<ReturnType<typeof fetchOrders>>["data"] = [];
  let initialMeta: Awaited<ReturnType<typeof fetchOrders>>["meta"] | null = null;
  try {
    const result = await fetchOrders({
      status: "ALL",
      page: 1,
      limit: 5,
    });
    initialOrders = result.data;
    initialMeta = result.meta;
  } catch {
    initialOrders = [];
  }
  return (
    <OrdersPageClient
      initialOrders={initialOrders}
      initialMeta={initialMeta}
    />
  );
}
