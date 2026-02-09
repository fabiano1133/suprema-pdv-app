import Link from "next/link";
import { Receipt, CreditCard, Calendar } from "lucide-react";
import type { Order } from "@/lib/types";
import { getTotalOrder } from "@/lib/services/orders";
import { formatDateBr } from "@/lib/utils/dateBr";
import { formatOrderStatusLabel } from "@/lib/utils/orderStatus";

const PAYMENT_LABELS: Record<string, string> = {
  PIX: "PIX",
  MONEY: "Dinheiro",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
};

interface OrderCardProps {
  order: Order;
  editavel: boolean;
}

function statusBadgeClass(status: string): string {
  if (status === "OPEN" || status === "ABERTA") return "bg-emerald-100 text-emerald-800";
  if (status === "PAID") return "bg-green-100 text-green-800";
  if (status === "FECHADA") return "bg-slate-100 text-slate-600";
  return "bg-red-50 text-red-700";
}

export function OrderCard({ order, editavel }: OrderCardProps) {
  const total = getTotalOrder(order);
  return (
    <li>
      <Link
        href={editavel ? `/orders/${order.id}` : "#"}
        className={`block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${
          !editavel ? "pointer-events-none opacity-75" : ""
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-slate-400 shrink-0" aria-hidden />
            <span className="font-mono font-semibold text-slate-800">{order.codigo}</span>
            {order.clienteNome && (
              <span className="ml-2 text-sm text-slate-500">— {order.clienteNome}</span>
            )}
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(order.status)}`}
          >
            {formatOrderStatusLabel(order.status)}
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between text-sm text-slate-600">
          <span>{order.items.length} produtos</span>
          <span className="font-semibold text-slate-800">
            R$ {total.toFixed(2).replace(".", ",")}
          </span>
        </div>
        {order.paymentMethod && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <CreditCard className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Pagamento: {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
          </div>
        )}
        <div className="mt-2 flex gap-1.5 text-xs text-slate-500">
          <Calendar className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
          <div className="space-y-0.5">
            <div>Criada em {formatDateBr(order.createdAt)}</div>
            {(order.status === "PAID" || order.status === "FECHADA") && order.updatedAt && (
              <div>Fechada (paga) em {formatDateBr(order.updatedAt)}</div>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
