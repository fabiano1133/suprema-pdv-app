"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardCheck, Plus, Barcode, CheckCircle, X } from "lucide-react";
import { fetchProducts, findProductByBarcode } from "@/lib/api/products";
import {
  createStockCount,
  fetchStockCounts,
  fetchStockCountById,
  addStockCountScan,
  finalizeStockCount,
  type StockCount,
} from "@/lib/api/stockCounts";
import type { Product } from "@/lib/types";
import { formatDateBr } from "@/lib/utils/dateBr";
import { PageTitle, Alert, LoadingState } from "@/components/ui";

interface StockCountsPageClientProps {
  initialProducts: Product[];
}

export function StockCountsPageClient({ initialProducts }: StockCountsPageClientProps) {
  const [produtos, setProdutos] = useState<Product[]>(initialProducts);
  const [loadingProdutos, setLoadingProdutos] = useState(initialProducts.length === 0);
  const [balancos, setBalancos] = useState<StockCount[]>([]);
  const [loadingLista, setLoadingLista] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [balancoSelecionado, setBalancoSelecionado] = useState<StockCount | null>(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [loadingScan, setLoadingScan] = useState(false);
  const [loadingCriar, setLoadingCriar] = useState(false);
  const [loadingFinalizar, setLoadingFinalizar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [showFormNovo, setShowFormNovo] = useState(false);
  const [nameNovo, setNameNovo] = useState("");
  const [descriptionNovo, setDescriptionNovo] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const focusBarcodeAfterScanRef = useRef(false);

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

  const carregarBalancos = useCallback(async () => {
    setLoadingLista(true);
    setErroLista(null);
    try {
      const lista = await fetchStockCounts();
      setBalancos(lista);
    } catch (e) {
      setErroLista(e instanceof Error ? e.message : "Erro ao listar balanços.");
      setBalancos([]);
    } finally {
      setLoadingLista(false);
    }
  }, []);

  useEffect(() => {
    carregarBalancos();
  }, [carregarBalancos]);

  useEffect(() => {
    if (initialProducts.length === 0) carregarProdutos();
  }, [initialProducts.length, carregarProdutos]);

  const handleSelecionarBalanco = useCallback(async (id: string) => {
    setErroDetalhe(null);
    setLoadingDetalhe(true);
    try {
      const balanco = await fetchStockCountById(id);
      setBalancoSelecionado(balanco);
    } catch (e) {
      setErroDetalhe(e instanceof Error ? e.message : "Erro ao carregar balanço.");
      setBalancoSelecionado(null);
    } finally {
      setLoadingDetalhe(false);
    }
  }, []);

  const fecharDetalhe = useCallback(() => {
    setBalancoSelecionado(null);
    setErroDetalhe(null);
    setLoadingDetalhe(false);
  }, []);

  const handleAbrirFormNovo = useCallback(() => {
    setShowFormNovo(true);
    setNameNovo("");
    setDescriptionNovo("");
    setErro(null);
  }, []);

  const handleCancelarFormNovo = useCallback(() => {
    setShowFormNovo(false);
    setNameNovo("");
    setDescriptionNovo("");
  }, []);

  const handleCriarBalanco = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const name = nameNovo.trim();
      if (!name) {
        setErro("Informe o nome do balanço.");
        return;
      }
      setErro(null);
      setSucesso(null);
      setLoadingCriar(true);
      try {
        const novo = await createStockCount({
          name,
          description: descriptionNovo.trim() || undefined,
        });
        setBalancoSelecionado(novo);
        setShowFormNovo(false);
        setNameNovo("");
        setDescriptionNovo("");
        await carregarBalancos();
        setSucesso("Balanço criado. Use o scanner para registrar as coletas.");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao criar balanço.");
      } finally {
        setLoadingCriar(false);
      }
    },
    [nameNovo, descriptionNovo, carregarBalancos]
  );

  const qtyNum = Math.max(1, Number(quantidade) || 1);

  const handleAdicionarScan = useCallback(
    async (e: React.MouseEvent | React.FormEvent) => {
      e.preventDefault();
      if (!balancoSelecionado || balancoSelecionado.status !== "IN_PROGRESS") return;
      const barcode = barcodeInput.trim();
      if (!barcode) {
        setErro("Informe o código de barras.");
        return;
      }
      setErro(null);
      setSucesso(null);
      setLoadingScan(true);
      try {
        const produto = await findProductByBarcode(barcode);
        if (!produto) {
          setErro("Produto não encontrado para o código de barras informado.");
          return;
        }
        const atualizado = await addStockCountScan(balancoSelecionado.id, {
          itemId: produto.id,
          quantity: qtyNum,
        });
        focusBarcodeAfterScanRef.current = true;
        setBalancoSelecionado(atualizado);
        setBarcodeInput("");
        setQuantidade("1");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao registrar scan.");
      } finally {
        setLoadingScan(false);
      }
    },
    [balancoSelecionado, barcodeInput, qtyNum]
  );

  useEffect(() => {
    if (!loadingScan && focusBarcodeAfterScanRef.current) {
      focusBarcodeAfterScanRef.current = false;
      const el = barcodeInputRef.current;
      if (el) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.focus();
          });
        });
      }
    }
  }, [loadingScan]);

  const handleFinalizar = useCallback(async () => {
    if (!balancoSelecionado || balancoSelecionado.status !== "IN_PROGRESS") return;
    setErro(null);
    setSucesso(null);
    setLoadingFinalizar(true);
    try {
      const finalizado = await finalizeStockCount(balancoSelecionado.id);
      setBalancoSelecionado(finalizado);
      await carregarBalancos();
      setSucesso("Balanço finalizado. Variâncias calculadas.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao finalizar balanço.");
    } finally {
      setLoadingFinalizar(false);
    }
  }, [balancoSelecionado, carregarBalancos]);

  const produtoNome = (itemId: string) => {
    const p = produtos.find((x) => x.id === itemId);
    return p ? (p.barcode ?? p.id.slice(0, 8)) + " — " + p.name : itemId;
  };

  return (
    <div className="space-y-8">
      <PageTitle className="flex items-center gap-2">
        <ClipboardCheck className="h-6 w-6 text-slate-600" aria-hidden />
        Conferência de estoque
      </PageTitle>

      {erro && <Alert message={erro} variant="error" />}
      {sucesso && <Alert message={sucesso} variant="success" />}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-slate-600">Balanços</h2>
          {!showFormNovo ? (
            <button
              type="button"
              onClick={handleAbrirFormNovo}
              className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Novo balanço
            </button>
          ) : null}
        </div>
        {showFormNovo && (
          <form
            onSubmit={handleCriarBalanco}
            className="mb-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4"
          >
            <h3 className="mb-3 text-sm font-medium text-slate-700">Criar balanço</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="balanco-name" className="block text-sm font-medium text-slate-700">
                  Nome
                </label>
                <input
                  id="balanco-name"
                  type="text"
                  value={nameNovo}
                  onChange={(e) => setNameNovo(e.target.value)}
                  placeholder="Ex.: Balanço Loja Centro - Jan/25"
                  className="input-field mt-1"
                  disabled={loadingCriar}
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="balanco-description" className="block text-sm font-medium text-slate-700">
                  Descrição (opcional)
                </label>
                <input
                  id="balanco-description"
                  type="text"
                  value={descriptionNovo}
                  onChange={(e) => setDescriptionNovo(e.target.value)}
                  placeholder="Ex.: Conferência mensal do estoque"
                  className="input-field mt-1"
                  disabled={loadingCriar}
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={!nameNovo.trim() || loadingCriar}
                className="btn-primary rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {loadingCriar ? "Criando…" : "Criar balanço"}
              </button>
              <button
                type="button"
                onClick={handleCancelarFormNovo}
                disabled={loadingCriar}
                className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
        {erroLista && <p className="mb-2 text-sm text-red-600">{erroLista}</p>}
        {loadingLista ? (
          <LoadingState message="Carregando balanços…" />
        ) : balancos.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
            Nenhum balanço. Clique em &quot;Novo balanço&quot; para iniciar uma conferência.
          </div>
        ) : (
          <ul className="space-y-2">
            {balancos.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => handleSelecionarBalanco(b.id)}
                  disabled={loadingDetalhe}
                  className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 ${
                    balancoSelecionado?.id === b.id ? "ring-2 ring-slate-400 ring-offset-2" : ""
                  }`}
                >
                  <div>
                    <span className="font-semibold text-slate-800">{b.name || b.id.slice(0, 8) + "…"}</span>
                    <span
                      className={`ml-2 rounded px-2 py-0.5 text-xs font-medium ${
                        b.status === "IN_PROGRESS"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {b.status === "IN_PROGRESS" ? "Em andamento" : "Finalizado"}
                    </span>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {b.lines.length} item(ns) · Criado em {formatDateBr(b.createdAt)}
                      {b.finalizedAt && ` · Finalizado em ${formatDateBr(b.finalizedAt)}`}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(balancoSelecionado || loadingDetalhe) && (
        <section className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Detalhes do balanço</h3>
            <button
              type="button"
              onClick={fecharDetalhe}
              disabled={loadingDetalhe}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden />
              Fechar
            </button>
          </div>
          {erroDetalhe && (
            <p className="mb-4 text-sm text-red-600" role="alert">
              {erroDetalhe}
            </p>
          )}
          {loadingDetalhe ? (
            <p className="text-slate-500">Carregando…</p>
          ) : balancoSelecionado ? (
            <>
              <dl className="mb-6 grid gap-2 sm:grid-cols-2">
                {balancoSelecionado.name && (
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Nome</dt>
                    <dd className="mt-0.5 font-medium text-slate-800">{balancoSelecionado.name}</dd>
                  </div>
                )}
                {balancoSelecionado.description && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase text-slate-500">Descrição</dt>
                    <dd className="mt-0.5 text-slate-600">{balancoSelecionado.description}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-medium uppercase text-slate-500">Status</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {balancoSelecionado.status === "IN_PROGRESS" ? "Em andamento" : "Finalizado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-slate-500">Criado em</dt>
                  <dd className="mt-0.5 text-slate-600">{formatDateBr(balancoSelecionado.createdAt)}</dd>
                </div>
                {balancoSelecionado.finalizedAt && (
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Finalizado em</dt>
                    <dd className="mt-0.5 text-slate-600">{formatDateBr(balancoSelecionado.finalizedAt)}</dd>
                  </div>
                )}
              </dl>

              {balancoSelecionado.status === "IN_PROGRESS" && (
                <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Barcode className="h-4 w-4" aria-hidden />
                    Registrar coleta (scan)
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="stock-count-barcode" className="block text-sm font-medium text-slate-700">
                        Código de barras
                      </label>
                      <input
                        ref={barcodeInputRef}
                        id="stock-count-barcode"
                        type="text"
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAdicionarScan(e);
                          }
                        }}
                        placeholder="Leia ou digite o código de barras"
                        className="input-field mt-1 font-mono"
                        disabled={loadingScan}
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label htmlFor="stock-count-qty" className="block text-sm font-medium text-slate-700">
                        Quantidade
                      </label>
                      <input
                        id="stock-count-qty"
                        type="number"
                        min={1}
                        max={9999}
                        value={quantidade}
                        onChange={(e) => setQuantidade(e.target.value)}
                        className="input-field mt-1"
                        disabled={loadingScan}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAdicionarScan}
                    disabled={!barcodeInput.trim() || loadingScan}
                    className="btn-secondary mt-3 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {loadingScan ? "Registrando…" : (
                      <>
                        <Plus className="h-4 w-4" aria-hidden />
                        Adicionar scan
                      </>
                    )}
                  </button>
                </div>
              )}

              <div>
                <h4 className="mb-2 text-sm font-medium text-slate-700">Itens</h4>
                {balancoSelecionado.lines.length === 0 ? (
                  <p className="rounded-lg border border-slate-100 bg-slate-50/50 py-4 text-center text-sm text-slate-500">
                    Nenhum item registrado.
                  </p>
                ) : (
                  <ul className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                    {balancoSelecionado.lines.map((linha) => (
                      <li key={linha.itemId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                        <span className="text-slate-700">{produtoNome(linha.itemId)}</span>
                        <span className="text-slate-800">
                          Contado: {linha.countedQuantity}
                          {linha.systemQuantity != null && (
                            <> · Sistema: {linha.systemQuantity} · Variância: {linha.variance ?? "—"}</>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {balancoSelecionado.status === "IN_PROGRESS" && balancoSelecionado.lines.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={handleFinalizar}
                    disabled={loadingFinalizar}
                    className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium disabled:opacity-50"
                  >
                    {loadingFinalizar ? "Finalizando…" : (
                      <>
                        <CheckCircle className="h-4 w-4" aria-hidden />
                        Finalizar balanço
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : null}
        </section>
      )}
    </div>
  );
}
