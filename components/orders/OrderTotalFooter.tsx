"use client";

import { Banknote } from "lucide-react";

interface OrderTotalFooterProps {
  total: number;
  onFechar: () => void;
  fechando: boolean;
}

export function OrderTotalFooter({ total, onFechar, fechando }: OrderTotalFooterProps) {
  return (
    <div className="sticky bottom-0 left-0 right-0 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-slate-800">Total</span>
        <span className="text-2xl font-bold text-slate-800">
          R$ {total.toFixed(2).replace(".", ",")}
        </span>
      </div>
      <button
        type="button"
        onClick={onFechar}
        disabled={fechando}
        className="btn-primary mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium disabled:opacity-50"
      >
        {fechando ? "Fechando…" : (
          <>
            <Banknote className="h-5 w-5" aria-hidden />
            Fechar comanda
          </>
        )}
      </button>
    </div>
  );
}
