"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Order, OrderStatusFilter } from "@/lib/types";
import { fetchOrders, type OrdersMeta } from "@/lib/api/orders";
import { ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { PageTitle, Alert, LoadingState, FAB } from "@/components/ui";
import { OrderFilters } from "./OrderFilters";
import { OrderList } from "./OrderList";
import { OrdersSummaryClient } from "./OrdersSummaryClient";

const DEFAULT_LIMIT = 5;

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface OrdersPageClientProps {
  initialOrders: Order[];
  initialMeta?: OrdersMeta | null;
}

export function OrdersPageClient({ initialOrders, initialMeta }: OrdersPageClientProps) {
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("ALL");
  const [startDate, setStartDate] = useState(todayISO);
  const [endDate, setEndDate] = useState(todayISO);
  const [page, setPage] = useState(initialMeta?.page ?? 1);
  const [limit] = useState(initialMeta?.limit ?? DEFAULT_LIMIT);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [meta, setMeta] = useState<OrdersMeta | null>(initialMeta ?? null);
  const [loading, setLoading] = useState(initialOrders.length === 0 && !initialMeta);
  const [erro, setErro] = useState<string | null>(null);
  const isFirstMount = useRef(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const result = await fetchOrders({
        status: statusFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit,
      });
      setOrders(result.data);
      setMeta(result.meta);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar comandas.");
      setOrders([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, startDate, endDate, page, limit]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (initialOrders.length === 0 && !initialMeta) carregar();
      return;
    }
    carregar();
  }, [statusFilter, startDate, endDate, page]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, startDate, endDate]);

  const goToPage = useCallback((newPage: number) => {
    setPage((p) => Math.max(1, Math.min(meta?.totalPages ?? 1, newPage)));
  }, [meta?.totalPages]);

  const podeEditar = (status: string) => status === "OPEN";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <PageTitle className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-slate-600" aria-hidden />
          Comandas
        </PageTitle>
        <OrderFilters
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
        />
      </div>

      {erro && (
        <Alert message={erro} onRetry={carregar} variant="error" />
      )}

      {loading ? (
        <LoadingState message="Carregando comandas…" />
      ) : (
        <>
          <ul className="space-y-3">
            <OrderList orders={orders} podeEditar={podeEditar} />
          </ul>
          {meta && meta.totalPages > 1 && (
            <nav
              className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4"
              aria-label="Paginação"
            >
              <p className="text-sm text-slate-600">
                Página {meta.page} de {meta.totalPages}
                {meta.total > 0 && (
                  <span className="ml-2 text-slate-500">
                    · Mostrando {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToPage(meta.page - 1)}
disabled={!meta.hasPreviousPage}
                className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Anterior
              </button>
              <button
                type="button"
                onClick={() => goToPage(meta.page + 1)}
                disabled={!meta.hasNextPage}
                className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Próxima
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
              </div>
            </nav>
          )}
        </>
      )}

      <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
        <OrdersSummaryClient embedded />
      </section>

      <FAB href="/orders/new" aria-label="Criar nova comanda" />
    </div>
  );
}
