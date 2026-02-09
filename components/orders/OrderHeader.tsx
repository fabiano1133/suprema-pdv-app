import type { Order } from "@/lib/types";
import { Receipt } from "lucide-react";
import { BackLink } from "@/components/ui";

interface OrderHeaderProps {
  order: Order;
}

export function OrderHeader({ order }: OrderHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <BackLink href="/orders" />
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-slate-500 shrink-0" aria-hidden />
          <div>
            <h1 className="text-xl font-semibold text-slate-800">{order.codigo}</h1>
          {order.clienteNome && (
              <p className="text-sm text-slate-500">{order.clienteNome}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
