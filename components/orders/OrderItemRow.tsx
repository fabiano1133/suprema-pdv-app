import { Loader2, Trash2 } from "lucide-react";
import type { OrderItem } from "@/lib/types";

interface OrderItemRowProps {
  item: OrderItem;
  onRemover: (item: OrderItem) => void;
  removendo?: boolean;
}

export function OrderItemRow({ item, onRemover, removendo = false }: OrderItemRowProps) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-800">{item.nome}</p>
        <p className="text-sm text-slate-500">
          R$ {item.precoUnitario.toFixed(2)} × {item.quantidade} = R$ {item.subtotal.toFixed(2)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600">Qtd: {item.quantidade}</span>
        <button
          type="button"
          onClick={() => onRemover(item)}
          disabled={removendo}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          {removendo ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="h-4 w-4" aria-hidden />
          )}
          {removendo ? "Removendo…" : "Remover"}
        </button>
      </div>
    </li>
  );
}
