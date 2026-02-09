import { Barcode } from "lucide-react";
import type { OrderItem } from "@/lib/types";
import { OrderItemRow } from "./OrderItemRow";

interface OrderItemsListProps {
  items: OrderItem[];
  onRemover: (item: OrderItem) => void;
  /** Id da linha/item que está sendo removido (para mostrar loading no botão). */
  removendoId?: string | null;
}

export function OrderItemsList({ items, onRemover, removendoId = null }: OrderItemsListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        <Barcode className="h-10 w-10 text-slate-300" aria-hidden />
        Nenhum produto. Use o campo código de barras acima para adicionar.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <OrderItemRow
          key={`${item.productId}-${item.nome}-${index}`}
          item={item}
          onRemover={onRemover}
          removendo={removendoId === (item.id ?? item.productId)}
        />
      ))}
    </ul>
  );
}
