import { fetchOrderById } from "@/lib/api/orders";
import { OrderDetailClient } from "@/components/orders";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  let initialOrder: Awaited<ReturnType<typeof fetchOrderById>> | null = null;
  try {
    initialOrder = await fetchOrderById(id);
  } catch {
    initialOrder = null;
  }
  return <OrderDetailClient orderId={id} initialOrder={initialOrder} />;
}
