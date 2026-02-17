"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Package, Barcode, Plus, ListOrdered } from "lucide-react";
import { fetchProducts, findProductByBarcode, findProductBySupplierCode, createProduct } from "@/lib/api/products";
import { createStockEntry, fetchStockEntries, fetchStockEntryById, updateStockEntry, type StockEntry, type StockEntryLine } from "@/lib/api/stockEntries";
import type { Product } from "@/lib/types";
import { formatDateBr } from "@/lib/utils/dateBr";
import { toBrCurrency, fromBrCurrency } from "@/lib/utils/currencyBr";
import { PageTitle, Alert, LoadingState } from "@/components/ui";

const DRAFT_STOCK_ENTRY_KEY = "draft:stock-entry";

function sanitizeBrCurrencyInput(value: string): string {
  let s = value.replace(/\D/g, (d) => (d === "," ? "," : ""));
  const idx = s.indexOf(",");
  if (idx >= 0) {
    const rest = s.slice(idx + 1).replace(/,/g, "");
    s = s.slice(0, idx + 1) + rest.slice(0, 2);
  }
  return s;
}

interface DraftStockEntry {
  reference: string;
  supplier: string;
  linhas: StockEntryLine[];
}

function loadDraft(): DraftStockEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_STOCK_ENTRY_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as DraftStockEntry;
    if (!data || typeof data.reference !== "string" || typeof data.supplier !== "string" || !Array.isArray(data.linhas)) return null;
    const linhas = data.linhas.filter((l) => l && typeof l.itemId === "string" && typeof l.quantity === "number");
    return { reference: data.reference ?? "", supplier: data.supplier ?? "", linhas };
  } catch {
    return null;
  }
}

function saveDraft(draft: DraftStockEntry) {
  if (typeof window === "undefined") return;
  try {
    if (draft.reference.trim() || draft.supplier.trim() || draft.linhas.length > 0) {
      localStorage.setItem(DRAFT_STOCK_ENTRY_KEY, JSON.stringify(draft));
    } else {
      localStorage.removeItem(DRAFT_STOCK_ENTRY_KEY);
    }
  } catch {
    // ignore
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DRAFT_STOCK_ENTRY_KEY);
  } catch {
    // ignore
  }
}

/** Soma o custo total das linhas (preço de custo × quantidade) usando a lista de produtos. */
function totalCustoLinhas(
  lines: { itemId: string; quantity: number }[],
  produtos: Product[]
): number {
  return lines.reduce((s, linha) => {
    const produto = produtos.find((p) => p.id === linha.itemId);
    return s + (produto ? produto.costPrice * linha.quantity : 0);
  }, 0);
}

interface StockEntriesPageClientProps {
  initialProducts: Product[];
}

export function StockEntriesPageClient({ initialProducts }: StockEntriesPageClientProps) {
  const [produtos, setProdutos] = useState<Product[]>(initialProducts);
  const [loadingProdutos, setLoadingProdutos] = useState(initialProducts.length === 0);
  const [pedidos, setPedidos] = useState<StockEntry[]>([]);
  const [loadingLista, setLoadingLista] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<StockEntry | null>(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [supplier, setSupplier] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [linhas, setLinhas] = useState<StockEntryLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscandoBarcode, setBuscandoBarcode] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const hasRestoredDraft = useRef(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const focusBarcodeAfterScanRef = useRef(false);
  const barcodeSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [barcodeSearchResults, setBarcodeSearchResults] = useState<Product[]>([]);
  const qtyParaNovoProdutoRef = useRef(1);

  const [showModalNovoProduto, setShowModalNovoProduto] = useState(false);
  const [supplierCodeParaCadastro, setSupplierCodeParaCadastro] = useState("");
  const [nomeNovoProduto, setNomeNovoProduto] = useState("");
  const [costPriceNovo, setCostPriceNovo] = useState(0);
  const [profitMarginNovo, setProfitMarginNovo] = useState(0);
  const [priceNovo, setPriceNovo] = useState(0);
  const [descriptionNovo, setDescriptionNovo] = useState("");
  const [loadingCadastro, setLoadingCadastro] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [currencyEditModal, setCurrencyEditModal] = useState<{
    field: "costPrice" | "profitMargin" | "price";
    value: string;
  } | null>(null);

  // Restaura rascunho ao montar (ex.: voltou da tela de Produtos)
  useEffect(() => {
    if (hasRestoredDraft.current) return;
    hasRestoredDraft.current = true;
    const draft = loadDraft();
    if (draft) {
      setReference(draft.reference);
      setSupplier(draft.supplier);
      setLinhas(draft.linhas);
    }
  }, []);

  // Salva rascunho ao alterar referência, fornecedor ou itens (não salva quando estiver editando)
  useEffect(() => {
    if (editingId) return;
    saveDraft({ reference, supplier, linhas });
  }, [editingId, reference, supplier, linhas]);

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

  const carregarPedidos = useCallback(async () => {
    setLoadingLista(true);
    setErroLista(null);
    try {
      const lista = await fetchStockEntries();
      setPedidos(lista);
    } catch (e) {
      setErroLista(e instanceof Error ? e.message : "Erro ao listar pedidos.");
      setPedidos([]);
    } finally {
      setLoadingLista(false);
    }
  }, []);

  useEffect(() => {
    carregarPedidos();
  }, [carregarPedidos]);

  useEffect(() => {
    if (initialProducts.length === 0) carregarProdutos();
  }, [initialProducts.length, carregarProdutos]);

  // Dropdown do input "Itens do pedido": filtro só por código de barras ou código do fornecedor (300ms debounce)
  useEffect(() => {
    const term = barcodeInput.trim().toLowerCase();
    if (!term) {
      setBarcodeSearchResults([]);
      return;
    }
    if (barcodeSearchTimeoutRef.current) clearTimeout(barcodeSearchTimeoutRef.current);
    barcodeSearchTimeoutRef.current = setTimeout(() => {
      const filtered = produtos.filter(
        (p) =>
          (p.barcode?.toLowerCase().includes(term) ?? false) ||
          (p.supplierCode?.toLowerCase().includes(term) ?? false)
      );
      setBarcodeSearchResults(filtered);
    }, 300);
    return () => {
      if (barcodeSearchTimeoutRef.current) clearTimeout(barcodeSearchTimeoutRef.current);
    };
  }, [barcodeInput, produtos]);

  const handleSelecionarPedido = useCallback(async (id: string) => {
    setErroDetalhe(null);
    setLoadingDetalhe(true);
    try {
      const pedido = await fetchStockEntryById(id);
      setPedidoSelecionado(pedido);
    } catch (e) {
      setErroDetalhe(e instanceof Error ? e.message : "Erro ao carregar detalhes.");
      setPedidoSelecionado(null);
    } finally {
      setLoadingDetalhe(false);
    }
  }, []);

  const fecharDetalhe = useCallback(() => {
    setPedidoSelecionado(null);
    setErroDetalhe(null);
    setLoadingDetalhe(false);
  }, []);

  const handleEditarPedido = useCallback((pedido: StockEntry) => {
    setEditingId(pedido.id);
    setReference(pedido.reference);
    setSupplier(pedido.supplier);
    setLinhas([...pedido.lines]);
    clearDraft();
    setErro(null);
    setSucesso(null);
    fecharDetalhe();
  }, [fecharDetalhe]);

  const handleCancelarEdicao = useCallback(() => {
    setEditingId(null);
    setReference("");
    setSupplier("");
    setLinhas([]);
    setErro(null);
    setSucesso(null);
    clearDraft();
  }, []);

  const qtyNum = Math.max(1, Number(quantidade) || 1);

  async function handleAdicionarPorBarcode(e: React.MouseEvent | React.FormEvent) {
    e.preventDefault();
    const codigo = barcodeInput.trim();
    if (!codigo) {
      setErro("Informe o código de barras ou código do fornecedor.");
      return;
    }
    setErro(null);
    setSucesso(null);
    setBuscandoBarcode(true);
    try {
      let produto = await findProductByBarcode(codigo);
      if (!produto) produto = await findProductBySupplierCode(codigo);
      if (!produto) {
        qtyParaNovoProdutoRef.current = qtyNum;
        setSupplierCodeParaCadastro(codigo);
        setNomeNovoProduto("");
        setCostPriceNovo(0);
        setProfitMarginNovo(0);
        setPriceNovo(0);
        setDescriptionNovo("");
        setErroModal(null);
        setCurrencyEditModal(null);
        setShowModalNovoProduto(true);
        return;
      }
      focusBarcodeAfterScanRef.current = true;
      setLinhas((prev) => {
        const idx = prev.findIndex((l) => l.itemId === produto.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + qtyNum };
          return next;
        }
        return [...prev, { itemId: produto.id, quantity: qtyNum }];
      });
      setBarcodeInput("");
      setQuantidade("1");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao buscar produto.");
    } finally {
      setBuscandoBarcode(false);
    }
  }

  useEffect(() => {
    if (!buscandoBarcode && focusBarcodeAfterScanRef.current) {
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
  }, [buscandoBarcode]);

  function handleSelecionarProdutoNoPedido(p: Product) {
    setBarcodeSearchResults([]);
    setBarcodeInput("");
    setErro(null);
    setLinhas((prev) => {
      const idx = prev.findIndex((l) => l.itemId === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qtyNum };
        return next;
      }
      return [...prev, { itemId: p.id, quantity: qtyNum }];
    });
    setQuantidade("1");
    focusBarcodeAfterScanRef.current = true;
  }

  function handleRemoverLinha(itemId: string) {
    setLinhas((prev) => prev.filter((l) => l.itemId !== itemId));
    setSucesso(null);
  }

  function handleFecharModalNovoProduto() {
    setShowModalNovoProduto(false);
    setSupplierCodeParaCadastro("");
    setErroModal(null);
    setCurrencyEditModal(null);
  }

  async function handleCadastrarProdutoNoModal(e: React.FormEvent) {
    e.preventDefault();
    const name = nomeNovoProduto.trim();
    if (!name) {
      setErroModal("Informe o nome do produto.");
      return;
    }
    const costPrice = costPriceNovo;
    const price = priceNovo;
    if (Number.isNaN(costPrice) || costPrice < 0) {
      setErroModal("Preço de custo inválido.");
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setErroModal("Preço de venda inválido.");
      return;
    }
    setErroModal(null);
    setLoadingCadastro(true);
    try {
      const novo = await createProduct({
        name,
        costPrice,
        price,
        supplierCode: supplierCodeParaCadastro.trim() || undefined,
        description: descriptionNovo.trim() || undefined,
      });
      setProdutos((prev) => [...prev, novo]);
      const qty = Math.max(1, qtyParaNovoProdutoRef.current);
      setLinhas((prev) => {
        const idx = prev.findIndex((l) => l.itemId === novo.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
          return next;
        }
        return [...prev, { itemId: novo.id, quantity: qty }];
      });
      setBarcodeInput("");
      setQuantidade("1");
      focusBarcodeAfterScanRef.current = true;
      setSucesso("Produto cadastrado e adicionado ao pedido.");
      handleFecharModalNovoProduto();
    } catch (err) {
      setErroModal(err instanceof Error ? err.message : "Erro ao cadastrar produto.");
    } finally {
      setLoadingCadastro(false);
    }
  }

  const temRascunho = !editingId && (reference.trim() || supplier.trim() || linhas.length > 0);

  function handleDescartarRascunho() {
    clearDraft();
    setReference("");
    setSupplier("");
    setLinhas([]);
    setErro(null);
    setSucesso(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reference.trim()) {
      setErro("Informe a referência (ex.: NF-12345).");
      return;
    }
    if (!supplier.trim()) {
      setErro("Informe o fornecedor.");
      return;
    }
    if (linhas.length === 0) {
      setErro("Adicione ao menos um item ao pedido.");
      return;
    }
    setErro(null);
    setSucesso(null);
    setLoading(true);
    try {
      if (editingId) {
        await updateStockEntry(editingId, { reference: reference.trim(), supplier: supplier.trim(), lines: linhas });
        setSucesso("Pedido atualizado com sucesso.");
      } else {
        await createStockEntry({ reference: reference.trim(), supplier: supplier.trim(), lines: linhas });
        setSucesso("Pedido cadastrado com sucesso.");
      }
      clearDraft();
      setEditingId(null);
      setReference("");
      setSupplier("");
      setLinhas([]);
      await carregarPedidos();
    } catch (e) {
      setErro(e instanceof Error ? e.message : (editingId ? "Erro ao atualizar pedido." : "Erro ao cadastrar pedido."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageTitle className="flex items-center gap-2">
        <Package className="h-6 w-6 text-slate-600" aria-hidden />
        Pedidos
      </PageTitle>
      {showModalNovoProduto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="modal-novo-produto-title">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="modal-novo-produto-title" className="mb-4 text-lg font-semibold text-slate-800">
              Produto não encontrado — Cadastrar
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              O código informado não está cadastrado. Preencha os dados para criar o produto e adicioná-lo ao pedido.
            </p>
            <form onSubmit={handleCadastrarProdutoNoModal}>
              {erroModal && <div className="mb-4"><Alert message={erroModal} variant="error" /></div>}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="modal-nome" className="block text-sm font-medium text-slate-700">Nome</label>
                  <input
                    id="modal-nome"
                    type="text"
                    value={nomeNovoProduto}
                    onChange={(e) => setNomeNovoProduto(e.target.value)}
                    placeholder="Ex.: Anel Solitário"
                    className="input-field mt-1 w-full"
                    disabled={loadingCadastro}
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor="modal-supplierCode" className="block text-sm font-medium text-slate-700">Código do fornecedor</label>
                  <input
                    id="modal-supplierCode"
                    type="text"
                    value={supplierCodeParaCadastro}
                    onChange={(e) => setSupplierCodeParaCadastro(e.target.value)}
                    placeholder="Ex.: FORN-12345"
                    className="input-field mt-1 w-full font-mono"
                    disabled={loadingCadastro}
                  />
                </div>
                <div>
                  <label htmlFor="modal-costPrice" className="block text-sm font-medium text-slate-700">Custo (R$)</label>
                  <input
                    id="modal-costPrice"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={currencyEditModal?.field === "costPrice" ? currencyEditModal.value : toBrCurrency(costPriceNovo)}
                    className="input-field mt-1 w-full"
                    disabled={loadingCadastro}
                    onFocus={() => setCurrencyEditModal({ field: "costPrice", value: toBrCurrency(costPriceNovo) || "" })}
                    onBlur={() => {
                      const raw = currencyEditModal?.field === "costPrice" ? currencyEditModal.value : toBrCurrency(costPriceNovo);
                      const n = fromBrCurrency(raw);
                      setCostPriceNovo(n);
                      setPriceNovo(n * (1 + profitMarginNovo / 100));
                      setCurrencyEditModal(null);
                    }}
                    onChange={(e) => {
                      const raw = sanitizeBrCurrencyInput(e.target.value);
                      const n = fromBrCurrency(raw);
                      setCurrencyEditModal({ field: "costPrice", value: raw });
                      setCostPriceNovo(n);
                      setPriceNovo(n * (1 + profitMarginNovo / 100));
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="modal-profitMargin" className="block text-sm font-medium text-slate-700">Margem de lucro (%)</label>
                  <input
                    id="modal-profitMargin"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,0"
                    value={currencyEditModal?.field === "profitMargin" ? currencyEditModal.value : toBrCurrency(profitMarginNovo)}
                    className="input-field mt-1 w-full"
                    disabled={loadingCadastro}
                    onFocus={() => setCurrencyEditModal({ field: "profitMargin", value: toBrCurrency(profitMarginNovo) || "" })}
                    onBlur={() => {
                      const raw = currencyEditModal?.field === "profitMargin" ? currencyEditModal.value : toBrCurrency(profitMarginNovo);
                      const n = fromBrCurrency(raw);
                      setProfitMarginNovo(n);
                      setPriceNovo(costPriceNovo * (1 + n / 100));
                      setCurrencyEditModal(null);
                    }}
                    onChange={(e) => {
                      const raw = sanitizeBrCurrencyInput(e.target.value);
                      const n = fromBrCurrency(raw);
                      setCurrencyEditModal({ field: "profitMargin", value: raw });
                      setProfitMarginNovo(n);
                      setPriceNovo(costPriceNovo * (1 + n / 100));
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="modal-price" className="block text-sm font-medium text-slate-700">Preço de venda (R$)</label>
                  <input
                    id="modal-price"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={currencyEditModal?.field === "price" ? currencyEditModal.value : toBrCurrency(priceNovo)}
                    className="input-field mt-1 w-full"
                    disabled={loadingCadastro}
                    onFocus={() => setCurrencyEditModal({ field: "price", value: toBrCurrency(priceNovo) || "" })}
                    onBlur={() => {
                      const raw = currencyEditModal?.field === "price" ? currencyEditModal.value : toBrCurrency(priceNovo);
                      const n = fromBrCurrency(raw);
                      setPriceNovo(n);
                      setProfitMarginNovo(costPriceNovo > 0 ? Math.round(((n / costPriceNovo) - 1) * 10000) / 100 : 0);
                      setCurrencyEditModal(null);
                    }}
                    onChange={(e) => {
                      const raw = sanitizeBrCurrencyInput(e.target.value);
                      const n = fromBrCurrency(raw);
                      setCurrencyEditModal({ field: "price", value: raw });
                      setPriceNovo(n);
                      setProfitMarginNovo(costPriceNovo > 0 ? Math.round(((n / costPriceNovo) - 1) * 10000) / 100 : 0);
                    }}
                  />
                  <p className="mt-0.5 text-xs text-slate-500">Edite para ajustar; a margem (%) será recalculada.</p>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="modal-description" className="block text-sm font-medium text-slate-700">Descrição (opcional)</label>
                  <textarea
                    id="modal-description"
                    rows={2}
                    value={descriptionNovo}
                    onChange={(e) => setDescriptionNovo(e.target.value)}
                    placeholder="Ex.: Anel com várias pedras"
                    className="input-field mt-1 w-full resize-none"
                    disabled={loadingCadastro}
                  />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleFecharModalNovoProduto}
                  disabled={loadingCadastro}
                  className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingCadastro}
                  className="btn-primary rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {loadingCadastro ? "Cadastrando…" : "Cadastrar e adicionar ao pedido"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {erro && <Alert message={erro} variant="error" />}
      {sucesso && <Alert message={sucesso} variant="success" />}
      {temRascunho && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
          <span>Rascunho salvo automaticamente. Você pode trocar de tela (ex.: Produtos) e voltar sem perder os dados.</span>
          <button
            type="button"
            onClick={handleDescartarRascunho}
            className="shrink-0 rounded px-2 py-1 text-slate-700 underline hover:bg-slate-200"
          >
            Descartar rascunho
          </button>
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6"
      >
        {editingId && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
            <span>Editando pedido. Altere os campos e salve.</span>
            <button
              type="button"
              onClick={handleCancelarEdicao}
              className="shrink-0 rounded px-2 py-1 font-medium text-slate-700 underline hover:bg-slate-200"
            >
              Cancelar edição
            </button>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="reference" className="block text-sm font-medium text-slate-700">
              Referência
            </label>
            <input
              id="reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex.: NF-12345"
              className="input-field mt-1"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="supplier" className="block text-sm font-medium text-slate-700">
              Fornecedor
            </label>
            <input
              id="supplier"
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Ex.: GF"
              className="input-field mt-1"
              disabled={loading}
            />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
            <Barcode className="h-4 w-4" aria-hidden />
            Itens do pedido
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative">
              <label htmlFor="stock-barcode" className="block text-sm font-medium text-slate-700">
                Código de barras ou código do fornecedor
              </label>
              <input
                ref={barcodeInputRef}
                id="stock-barcode"
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onFocus={() => barcodeInput.trim() && setBarcodeSearchResults(barcodeSearchResults.length ? barcodeSearchResults : [])}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdicionarPorBarcode(e);
                  }
                }}
                placeholder="Leia ou digite código de barras ou código do fornecedor"
                className="input-field mt-1 w-full"
                disabled={loading || buscandoBarcode}
                autoComplete="off"
              />
              {barcodeSearchResults.length > 0 && barcodeInput.trim() && (
                <ul
                  className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                  role="listbox"
                >
                  {barcodeSearchResults.map((p) => (
                    <li key={p.id} role="option">
                      <button
                        type="button"
                        onClick={() => handleSelecionarProdutoNoPedido(p)}
                        className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        <span className="font-medium text-slate-800">{p.name}</span>
                        <span className="text-xs text-slate-500">
                          {p.barcode ? `Cod. barras: ${p.barcode}` : ""}
                          {p.barcode && (p.sku || p.supplierCode) ? " · " : ""}
                          {p.supplierCode ? `Fornec.: ${p.supplierCode}` : ""}
                          {p.supplierCode && p.sku ? " · " : ""}
                          {p.sku ? `SKU: ${p.sku}` : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label htmlFor="stock-qty" className="block text-sm font-medium text-slate-700">
                Quantidade
              </label>
              <input
                id="stock-qty"
                type="number"
                min={1}
                max={9999}
                placeholder="1"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                className="input-field mt-1"
                disabled={loading}
              />
            </div>
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={handleAdicionarPorBarcode}
              disabled={!barcodeInput.trim() || loading || buscandoBarcode}
              className="btn-secondary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {buscandoBarcode ? "Buscando…" : (
                <>
                  <Plus className="h-4 w-4" aria-hidden />
                  Adicionar à lista
                </>
              )}
            </button>
          </div>
        </div>

        {linhas.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-700">Itens adicionados</h3>
            <ul className="rounded-lg border border-slate-200 divide-y divide-slate-100">
              {linhas.map((linha) => {
                const produto = produtos.find((p) => p.id === linha.itemId);
                const custoUn = produto ? produto.costPrice : 0;
                const custoLinha = custoUn * linha.quantity;
                return (
                  <li
                    key={linha.itemId}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-700">
                      {produto ? produto.name : linha.itemId} × {linha.quantity}
                      {produto && (
                        <span className="ml-2 text-slate-500">
                          · R$ {toBrCurrency(custoUn)}/un. · <span className="font-medium text-slate-700">R$ {toBrCurrency(custoLinha)}</span>
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoverLinha(linha.itemId)}
                      className="text-red-600 hover:underline"
                      aria-label="Remover"
                    >
                      Remover
                    </button>
                  </li>
                );
              })}
            </ul>
            {linhas.length > 0 && (
              <p className="mt-2 text-sm font-medium text-slate-700">
                Total: R$ {toBrCurrency(totalCustoLinhas(linhas, produtos))}
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={linhas.length === 0 || loading}
          className="btn-primary rounded-lg px-4 py-2.5 font-medium disabled:opacity-50"
        >
          {loading ? (editingId ? "Salvando…" : "Cadastrando…") : (editingId ? "Salvar alterações" : "Cadastrar pedido")}
        </button>
      </form>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-600">
        <ListOrdered className="h-4 w-4" aria-hidden />
        Pedidos cadastrados
      </h2>
        {erroLista && <p className="mb-2 text-sm text-red-600">{erroLista}</p>}
        {loadingLista ? (
          <LoadingState message="Carregando pedidos…" />
        ) : pedidos.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
            Nenhum pedido cadastrado.
          </div>
        ) : (
          <ul className="space-y-2">
            {pedidos.map((pedido) => (
              <li key={pedido.id}>
                <button
                  type="button"
                  onClick={() => handleSelecionarPedido(pedido.id)}
                  disabled={loadingDetalhe}
                  className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 ${
                    pedidoSelecionado?.id === pedido.id ? "ring-2 ring-slate-400 ring-offset-2" : ""
                  }`}
                >
                  <div>
                    <span className="font-semibold text-slate-800">{pedido.reference || "—"}</span>
                    {pedido.supplier && (
                      <span className="ml-2 text-sm text-slate-500">— {pedido.supplier}</span>
                    )}
                    <p className="mt-0.5 text-xs text-slate-500">
                      {pedido.lines.length} item(ns) · {pedido.lines.reduce((s, l) => s + l.quantity, 0)} un.
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-slate-700">
                      Total: R$ {toBrCurrency(totalCustoLinhas(pedido.lines, produtos))}
                    </p>
                  </div>
                  {pedido.createdAt && (
                    <span className="text-xs text-slate-500">{formatDateBr(pedido.createdAt)}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {(pedidoSelecionado || loadingDetalhe) && (
          <section className="mt-6 rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-slate-800">Detalhes do pedido</h3>
              <div className="flex gap-2">
                {pedidoSelecionado && (
                  <button
                    type="button"
                    onClick={() => handleEditarPedido(pedidoSelecionado)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                  >
                    Editar
                  </button>
                )}
                <button
                  type="button"
                  onClick={fecharDetalhe}
                  disabled={loadingDetalhe}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  Fechar
                </button>
              </div>
            </div>
            {erroDetalhe && (
              <p className="mb-4 text-sm text-red-600" role="alert">
                {erroDetalhe}
              </p>
            )}
            {loadingDetalhe ? (
              <p className="text-slate-500">Carregando detalhes…</p>
            ) : pedidoSelecionado ? (
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase text-slate-500">Referência</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{pedidoSelecionado.reference || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-slate-500">Fornecedor</dt>
                  <dd className="mt-0.5 text-slate-800">{pedidoSelecionado.supplier || "—"}</dd>
                </div>
                {pedidoSelecionado.createdAt && (
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Data</dt>
                    <dd className="mt-0.5 text-slate-600">{formatDateBr(pedidoSelecionado.createdAt)}</dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="mb-2 text-xs font-medium uppercase text-slate-500">Itens</dt>
                  <dd>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <ul className="min-w-[32rem] divide-y divide-slate-100">
                        <li className="grid grid-cols-[8rem_1fr_5rem_7rem_7rem] gap-2 px-3 py-2 text-xs font-medium uppercase text-slate-500 bg-slate-50">
                          <span>Cód. fornecedor</span>
                          <span>Item</span>
                          <span>Quantidade</span>
                          <span>Custo unitário</span>
                          <span className="text-right">Custo total</span>
                        </li>
                        {pedidoSelecionado.lines.map((linha) => {
                          const produto = produtos.find((p) => p.id === linha.itemId);
                          const custoUn = produto ? produto.costPrice : 0;
                          const custoLinha = custoUn * linha.quantity;
                          return (
                            <li key={linha.itemId} className="grid grid-cols-[8rem_1fr_5rem_7rem_7rem] gap-2 px-3 py-2 text-sm items-center">
                              <span className="font-mono text-slate-600 text-xs">
                                {produto?.supplierCode ?? "—"}
                              </span>
                              <span className="text-slate-700 min-w-0 truncate" title={produto ? produto.name : linha.itemId}>
                                {produto ? produto.name : linha.itemId}
                              </span>
                              <span className="text-slate-800">{linha.quantity}</span>
                              <span className="text-slate-700">R$ {toBrCurrency(custoUn)}</span>
                              <span className="text-slate-800 font-medium text-right">R$ {toBrCurrency(custoLinha)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      Total: R$ {toBrCurrency(totalCustoLinhas(pedidoSelecionado.lines, produtos))}
                    </p>
                  </dd>
                </div>
              </dl>
            ) : null}
          </section>
        )}
      </section>
    </div>
  );
}
