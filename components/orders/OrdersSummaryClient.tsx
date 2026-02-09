"use client";

import { useCallback, useState } from "react";
import { fetchOrdersSummaryPdf } from "@/lib/api/orders";
import { PageTitle, Alert } from "@/components/ui";

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface OrdersSummaryClientProps {
  /** Quando true, exibe apenas o bloco do resumo (sem PageTitle), para uso na página de comandas. */
  embedded?: boolean;
}

export function OrdersSummaryClient({ embedded }: OrdersSummaryClientProps) {
  const [date, setDate] = useState(todayISO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePrint = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const blob = await fetchOrdersSummaryPdf(date);
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (w) {
        // Abre o diálogo de impressão após o PDF carregar (navegadores podem não disparar onload para PDF)
        setTimeout(() => {
          try {
            w.print();
          } catch {
            // ignora se a janela já fechou
          }
          URL.revokeObjectURL(url);
        }, 800);
      } else {
        URL.revokeObjectURL(url);
        setError("Permita pop-ups para abrir o resumo e imprimir.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar resumo.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  return (
    <div className="space-y-6">
      {!embedded && (
        <>
          <PageTitle>Resumo de vendas</PageTitle>
          <p className="text-sm text-slate-600">
            Gere o PDF do resumo de vendas da data escolhida e abra o utilitário de impressão.
          </p>
        </>
      )}
      {embedded && (
        <h2 className="text-lg font-semibold text-slate-800">Resumo de vendas</h2>
      )}
      {error && <Alert message={error} variant="error" />}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="summary-date" className="block text-sm font-medium text-slate-700">
              Data
            </label>
            <input
              id="summary-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field mt-1"
            />
          </div>
          <button
            type="button"
            onClick={handlePrint}
            disabled={loading}
            className="rounded-lg bg-slate-800 px-4 py-2.5 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? "Gerando…" : "Gerar e imprimir"}
          </button>
        </div>
      </div>
    </div>
  );
}
