import { ShoppingCart } from "lucide-react";
import type { Order } from "@/lib/types";
import { OrderCard } from "./OrderCard";

interface OrderListProps {
  orders: Order[];
  podeEditar: (status: string) => boolean;
}

export function OrderList({ orders, podeEditar }: OrderListProps) {
  if (orders.length === 0) {
    return (
      <li className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        <ShoppingCart className="h-12 w-12 text-slate-300" aria-hidden />
        Nenhuma comanda encontrada.
      </li>
    );
  }
  return (
    <>
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          editavel={podeEditar(order.status)}
        />
      ))}
    </>
  );
}
