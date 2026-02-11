"use client";

import { useCallback, useEffect, useState } from "react";
import { Tag, Plus, FileOutput, Trash2 } from "lucide-react";
import { fetchProducts, generateEtiquetasPdf } from "@/lib/api/products";
import type { Product } from "@/lib/types";
import type { PedidoEtiqueta } from "@/lib/api/products";
import { PageTitle, Alert, LoadingState } from "@/components/ui";
import { openPdfForPrint } from "./openPdfForPrint";

interface LabelsPageClientProps {
  initialProducts: Product[];
  /** Quando true, exibe apenas o bloco de etiquetas (sem PageTitle), para uso na página de Produtos. */
  embedded?: boolean;
}

export function LabelsPageClient({ initialProducts, embedded }: LabelsPageClientProps) {
  const [produtos, setProdutos] = useState<Product[]>(initialProducts);
  const [loadingProdutos, setLoadingProdutos] = useState(initialProducts.length === 0);
  const [productId, setProductId] = useState<string>("");
  const [quantidade, setQuantidade] = useState<string>("");
  const [linhas, setLinhas] = useState<PedidoEtiqueta[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const produtoSelecionado = produtos.find((p) => p.id === productId);

  const carregarProdutos = useCallback(async () => {
    setLoadingProdutos(true);
    setErro(null);
    try {
      const lista = await fetchProducts();
      setProdutos(lista);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar produtos.");
      setProdutos([]);
    } finally {
      setLoadingProdutos(false);
    }
  }, []);

  useEffect(() => {
    if (initialProducts.length === 0) carregarProdutos();
  }, [initialProducts.length, carregarProdutos]);

  const qtyNum = Number(quantidade) || 0;

  function handleAdicionar(e: React.MouseEvent) {
    e.preventDefault();
    if (!produtoSelecionado || qtyNum < 1) return;
    setLinhas((prev) => {
      const idx = prev.findIndex((l) => l.productId === produtoSelecionado.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qtyNum };
        return next;
      }
      return [...prev, { productId: produtoSelecionado.id, quantity: qtyNum }];
    });
    setSucesso(null);
  }

  function handleRemoverLinha(productId: string) {
    setLinhas((prev) => prev.filter((l) => l.productId !== productId));
    setSucesso(null);
  }

  async function handleGerarPdf(e: React.FormEvent) {
    e.preventDefault();
    if (linhas.length === 0) return;
    setErro(null);
    setSucesso(null);
    setLoading(true);
    try {
      const blob = await generateEtiquetasPdf({ produtos: linhas });
      const result = openPdfForPrint(blob);
      if (result === "new_tab") {
        setSucesso("PDF aberto em nova aba. Use Arquivo > Imprimir (ou Ctrl+P) na aba do PDF.");
      } else if (result === "printed") {
        setSucesso("PDF gerado. Use o diálogo de impressão para imprimir.");
      } else {
        setErro("Não foi possível abrir o PDF. Verifique se o navegador permite pop-ups para este site.");
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar etiquetas PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <PageTitle className="flex items-center gap-2">
          <Tag className="h-6 w-6 text-slate-600" aria-hidden />
          Etiquetas BOPP
        </PageTitle>
      )}
      <form
        onSubmit={handleGerarPdf}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6"
      >
        {loadingProdutos && produtos.length === 0 ? (
          <LoadingState message="Carregando produtos…" />
        ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="product-select" className="block text-sm font-medium text-slate-700">
              Produto
            </label>
            <select
              id="product-select"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="input-field mt-1"
              disabled={loading || loadingProdutos}
            >
              <option value="">Selecione um produto</option>
              {produtos.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.sku ?? produto.id.slice(0, 8)} — {produto.name}
                </option>
              ))}
            </select>
            {loadingProdutos && produtos.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">Atualizando lista…</p>
            )}
          </div>
          <div>
            <label htmlFor="qty" className="block text-sm font-medium text-slate-700">
              Quantidade
            </label>
            <input
              id="qty"
              type="number"
              min={1}
              max={500}
              placeholder="Qtd"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="input-field mt-1"
              disabled={loading}
            />
          </div>
        </div>
        )}
        <div>
          <button
            type="button"
            onClick={handleAdicionar}
            disabled={!produtoSelecionado || qtyNum < 1 || loading}
            className="btn-secondary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Adicionar à lista
          </button>
        </div>

        {linhas.length > 0 && (
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
            <Tag className="h-4 w-4" aria-hidden />
            Produtos para etiquetas
          </h2>
            <ul className="border border-slate-200 rounded-lg divide-y divide-slate-100">
              {linhas.map((linha) => {
                const produto = produtos.find((p) => p.id === linha.productId);
                return (
                  <li
                    key={linha.productId}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-700">
                      {produto ? (produto.sku ?? produto.id.slice(0, 8)) + " — " + produto.name : linha.productId} × {linha.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoverLinha(linha.productId)}
                      className="flex items-center gap-1.5 text-red-600 hover:underline"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      Remover
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {erro && (
          <p className="text-sm text-red-600" role="alert">
            {erro}
          </p>
        )}
        {sucesso && (
          <p className="text-sm text-emerald-600" role="status">
            {sucesso}
          </p>
        )}
        <button
          type="submit"
          disabled={linhas.length === 0 || loading}
          className="btn-primary mt-2 flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium disabled:opacity-50"
        >
          {loading ? "Gerando PDF…" : (
            <>
              <FileOutput className="h-4 w-4" aria-hidden />
              Gerar etiquetas (PDF)
            </>
          )}
        </button>
      </form>
    </div>
  );
}
