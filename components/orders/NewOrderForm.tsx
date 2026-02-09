"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShoppingCart, Plus, X } from "lucide-react";
import { createOrder } from "@/lib/api/orders";
import { PageTitle, Alert, BackLink } from "@/components/ui";

export function NewOrderForm() {
  const router = useRouter();
  const [clienteNome, setClienteNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      const order = await createOrder(clienteNome?.trim() || undefined);
      router.push(`/orders/${order.id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar comanda.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex items-center gap-4">
        <BackLink href="/orders" />
        <PageTitle className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-slate-600" aria-hidden />
          Nova comanda
        </PageTitle>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">Nome do cliente (opcional)</label>
        <input
          type="text"
          value={clienteNome}
          onChange={(e) => setClienteNome(e.target.value)}
          placeholder="Ex.: Fabiano Albuquerque"
          className="input-field mt-1"
          disabled={loading}
        />
        {erro && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {erro}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium disabled:opacity-50"
          >
            {loading ? "Criando…" : (
              <>
                <Plus className="h-4 w-4" aria-hidden />
                Criar comanda
              </>
            )}
          </button>
          <Link
            href="/orders"
            className="btn-secondary flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium"
          >
            <X className="h-4 w-4" aria-hidden />
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
