"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { Package, Search, Barcode, PackagePlus, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { createProduct, fetchProducts, fetchProductsPaginated, fetchProductById, findProductBySupplierCode, updateProduct, generateEtiquetasPdf, type ProductsMeta, type LabelModel } from "@/lib/api/products";
import { productFormSchema, type ProductFormValues } from "@/lib/schemas/product";
import { toBrCurrency, fromBrCurrency } from "@/lib/utils/currencyBr";
import type { Product } from "@/lib/types";
import { LabelsPageClient } from "@/components/labels";
import { openPdfForPrint } from "@/components/labels/openPdfForPrint";
import { PageTitle, LoadingState, Alert } from "@/components/ui";

function sanitizeBrCurrencyInput(value: string): string {
  let s = value.replace(/\D/g, (d) => (d === "," ? "," : ""));
  const idx = s.indexOf(",");
  if (idx >= 0) {
    const rest = s.slice(idx + 1).replace(/,/g, "");
    s = s.slice(0, idx + 1) + rest.slice(0, 2);
  }
  return s;
}

function formatarData(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

const DEFAULT_LIMIT = 5;

interface ProductsPageClientProps {
  initialProducts: Product[];
  initialMeta?: ProductsMeta | null;
}

export function ProductsPageClient({ initialProducts, initialMeta }: ProductsPageClientProps) {
  const [produtos, setProdutos] = useState<Product[]>(initialProducts);
  const [meta, setMeta] = useState<ProductsMeta | null>(initialMeta ?? null);
  const [page, setPage] = useState(initialMeta?.page ?? 1);
  const [limit] = useState(initialMeta?.limit ?? DEFAULT_LIMIT);
  const [loadingLista, setLoadingLista] = useState(initialProducts.length === 0 && !initialMeta);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Product | null>(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState<string | null>(null);
  const [supplierCodeInput, setSupplierCodeInput] = useState("");
  const [produtoEncontrado, setProdutoEncontrado] = useState<Product | null>(null);
  const [verificandoSupplierCode, setVerificandoSupplierCode] = useState(false);
  const [erroVerificacao, setErroVerificacao] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [erroSubmit, setErroSubmit] = useState<string | null>(null);
  const [qtyEtiqueta, setQtyEtiqueta] = useState("1");
  const [modelEtiqueta, setModelEtiqueta] = useState<LabelModel>("95x12");
  const [loadingEtiqueta, setLoadingEtiqueta] = useState(false);
  const [erroEtiqueta, setErroEtiqueta] = useState<string | null>(null);
  const [sucessoEtiqueta, setSucessoEtiqueta] = useState<string | null>(null);
  const [filterNomeBarcode, setFilterNomeBarcode] = useState("");
  const isFirstMount = useRef(true);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { name: "", costPrice: 0, profitMargin: 0, price: 0, supplierCode: "", description: "" },
  });

  const [currencyEdit, setCurrencyEdit] = useState<{
    field: "costPrice" | "profitMargin" | "price";
    value: string;
  } | null>(null);

  const costPrice = watch("costPrice");
  const profitMargin = watch("profitMargin");

  const carregarProdutos = useCallback(async () => {
    setLoadingLista(true);
    setErroLista(null);
    try {
      const result = await fetchProductsPaginated({ 
        page, 
        limit,
        search: filterNomeBarcode.trim() || undefined
      });
      setProdutos(result.data);
      setMeta(result.meta);
    } catch (e) {
      setErroLista(e instanceof Error ? e.message : "Erro ao carregar produtos.");
      setProdutos([]);
      setMeta(null);
    } finally {
      setLoadingLista(false);
    }
  }, [page, limit, filterNomeBarcode]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (initialProducts.length === 0 && !initialMeta) carregarProdutos();
      return;
    }
    carregarProdutos();
  }, [page, filterNomeBarcode, carregarProdutos]);

  const goToPage = useCallback((newPage: number) => {
    setPage((p) => Math.max(1, Math.min(meta?.totalPages ?? 1, newPage)));
  }, [meta?.totalPages]);

  const handleVerificarSupplierCode = useCallback(async () => {
    const code = supplierCodeInput.trim();
    if (!code) {
      setErroVerificacao("Informe o código do fornecedor para verificar.");
      return;
    }
    setErroVerificacao(null);
    setVerificandoSupplierCode(true);
    try {
      const encontrado = await findProductBySupplierCode(code);
      setProdutoEncontrado(encontrado);
      setEditingId(null);
      await carregarProdutos();
    } catch (e) {
      setErroVerificacao(e instanceof Error ? e.message : "Erro ao verificar.");
      setProdutoEncontrado(null);
    } finally {
      setVerificandoSupplierCode(false);
    }
  }, [supplierCodeInput, carregarProdutos]);

  const handleEditarProdutoEncontrado = useCallback(() => {
    if (!produtoEncontrado) return;
    const margin =
      produtoEncontrado.costPrice > 0
        ? Math.round(((produtoEncontrado.price / produtoEncontrado.costPrice) - 1) * 10000) / 100
        : 0;
    reset({
      name: produtoEncontrado.name,
      costPrice: produtoEncontrado.costPrice,
      profitMargin: Math.max(0, margin),
      price: produtoEncontrado.price,
      supplierCode: produtoEncontrado.supplierCode ?? "",
      description: produtoEncontrado.description ?? "",
    });
    setEditingId(produtoEncontrado.id);
    setProdutoEncontrado(null);
    setSupplierCodeInput("");
    setErroVerificacao(null);
  }, [produtoEncontrado, reset]);

  const handleVerificarOutro = useCallback(() => {
    setSupplierCodeInput("");
    setProdutoEncontrado(null);
    setErroVerificacao(null);
    setEditingId(null);
  }, []);

  const handleCancelarEdicao = useCallback(() => {
    setEditingId(null);
    setErroSubmit(null);
    reset({ name: "", costPrice: 0, profitMargin: 0, price: 0, supplierCode: "", description: "" });
  }, [reset]);

  const handleVerificarSupplierCodeRef = useRef(handleVerificarSupplierCode);
  handleVerificarSupplierCodeRef.current = handleVerificarSupplierCode;
  useEffect(() => {
    const code = supplierCodeInput.trim();
    if (code.length < 2) return;
    const t = setTimeout(() => {
      handleVerificarSupplierCodeRef.current();
    }, 400);
    return () => clearTimeout(t);
  }, [supplierCodeInput]);

  // Preenche o campo supplierCode do formulário quando o usuário verificou e o produto não existe
  useEffect(() => {
    if (supplierCodeInput.trim() && !produtoEncontrado && !editingId) {
      setValue("supplierCode", supplierCodeInput.trim());
    }
  }, [supplierCodeInput, produtoEncontrado, editingId, setValue]);

  const onSubmit = useCallback(
    async (data: ProductFormValues) => {
      setErroSubmit(null);
      try {
        if (editingId) {
          await updateProduct(editingId, {
            name: data.name.trim(),
            costPrice: data.costPrice,
            price: data.price,
            supplierCode: data.supplierCode?.trim() || undefined,
            description: data.description?.trim() ?? "",
          });
          await carregarProdutos();
          setEditingId(null);
          reset({ name: "", costPrice: 0, profitMargin: 0, price: 0, supplierCode: "", description: "" });
        } else {
          await createProduct({
            name: data.name.trim(),
            costPrice: data.costPrice,
            price: data.price,
            supplierCode: data.supplierCode?.trim() || undefined,
            description: data.description?.trim() || undefined,
          });
          await carregarProdutos();
          reset({ name: "", costPrice: 0, profitMargin: 0, price: 0, supplierCode: "", description: "" });
        }
      } catch (e) {
        setErroSubmit(e instanceof Error ? e.message : "Erro ao salvar produto.");
      }
    },
    [carregarProdutos, reset, editingId]
  );

  const handleSelecionarProduto = useCallback(async (id: string) => {
    setErroDetalhe(null);
    setLoadingDetalhe(true);
    try {
      const produto = await fetchProductById(id);
      setProdutoSelecionado(produto);
    } catch (e) {
      setErroDetalhe(e instanceof Error ? e.message : "Erro ao carregar detalhes.");
      setProdutoSelecionado(null);
    } finally {
      setLoadingDetalhe(false);
    }
  }, []);

  const fecharDetalhe = useCallback(() => {
    setProdutoSelecionado(null);
    setErroDetalhe(null);
    setLoadingDetalhe(false);
    setQtyEtiqueta("1");
    setErroEtiqueta(null);
    setSucessoEtiqueta(null);
  }, []);

  const handleGerarEtiqueta = useCallback(async () => {
    if (!produtoSelecionado) return;
    const qty = Math.max(1, Number(qtyEtiqueta) || 1);
    setErroEtiqueta(null);
    setSucessoEtiqueta(null);
    setLoadingEtiqueta(true);
    try {
      const blob = await generateEtiquetasPdf({
        produtos: [{ productId: produtoSelecionado.id, quantity: qty }],
        model: modelEtiqueta,
      });
      const result = openPdfForPrint(blob);
      if (result === "new_tab") {
        setSucessoEtiqueta("PDF aberto em nova aba. Use Arquivo > Imprimir (ou Ctrl+P) na aba do PDF.");
      } else if (result === "printed") {
        setSucessoEtiqueta("PDF gerado. Use o diálogo de impressão para imprimir.");
      } else {
        setErroEtiqueta("Não foi possível abrir o PDF. Verifique se o navegador permite pop-ups para este site.");
      }
    } catch (e) {
      setErroEtiqueta(e instanceof Error ? e.message : "Erro ao gerar etiquetas PDF.");
    } finally {
      setLoadingEtiqueta(false);
    }
  }, [produtoSelecionado, qtyEtiqueta, modelEtiqueta]);

  const mostrarFormulario = !produtoEncontrado || editingId !== null;

  return (
    <div className="space-y-12">
     

      {/* ——— SEÇÃO 1: PRODUTOS (listagem) ——— */}
      <section
        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        aria-labelledby="section-produtos"
      >
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
          <h2 id="section-produtos" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-800">
            <Package className="h-5 w-5" aria-hidden />
            Produtos
          </h2>
        </div>
        <div className="p-6">
          {erroLista && <div className="mb-4"><Alert message={erroLista} variant="error" /></div>}
          {!loadingLista && produtos.length > 0 && (
            <div className="mb-4">
              <label htmlFor="filter-nome-sku" className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Search className="h-4 w-4" aria-hidden />
                Filtrar por nome ou código de barras
              </label>
              <input
                id="filter-nome-sku"
                type="text"
                value={filterNomeBarcode}
                onChange={(e) => {
                  setFilterNomeBarcode(e.target.value);
                  setPage(1);
                }}
                placeholder="Digite nome ou código de barras…"
                className="input-field mt-1 max-w-md"
              />
            </div>
          )}
          {loadingLista ? (
            <LoadingState message="Carregando produtos…" />
          ) : produtos.length === 0 ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 py-12 text-center text-slate-500">
              {filterNomeBarcode.trim() ? "Nenhum produto encontrado para o filtro." : "Nenhum produto cadastrado."}
            </div>
          ) : (
            <>
              <ul className="space-y-2">
                {produtos.map((produto) => (
                  <li key={produto.id}>
                    <button
                      type="button"
                      onClick={() => handleSelecionarProduto(produto.id)}
                      disabled={loadingDetalhe}
                      className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 ${produtoSelecionado?.id === produto.id ? "ring-2 ring-slate-400 ring-offset-2" : ""}`}
                    >
                      <div>
                        <p className="font-medium text-slate-800">{produto.name}</p>
                        {produto.sku && <p className="mt-0.5 font-mono text-sm text-slate-500">{produto.sku}</p>}
                        {produto.description && <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{produto.description}</p>}
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium text-slate-800">R$ {produto.price.toFixed(2).replace(".", ",")}</p>
                        <p className="mt-0.5 text-slate-500">Estoque: {produto.quantity}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              {meta && meta.totalPages > 1 && (
                <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4" aria-label="Paginação">
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
        </div>
      </section>

      {/* ——— SEÇÃO 2: CADASTRO DE PRODUTO (verificar + formulário) ——— */}
      <section
        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        aria-labelledby="section-cadastro"
      >
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
          <h2 id="section-cadastro" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-800">
            <PackagePlus className="h-5 w-5" aria-hidden />
            Cadastro de Produto
          </h2>
        </div>
        <div className="p-6 space-y-6">
          {/* Bloco: Verificar produto */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Barcode className="h-4 w-4" aria-hidden />
            Verificar produto
          </h3>
            {erroVerificacao && <div className="mt-3"><Alert message={erroVerificacao} variant="error" /></div>}
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="min-w-[180px] flex-1">
                <label htmlFor="supplier-code-verify" className="block text-sm font-medium text-slate-700">
                  Código do fornecedor
                </label>
                <input
                  id="supplier-code-verify"
                  type="text"
                  value={supplierCodeInput}
                  onChange={(e) => setSupplierCodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleVerificarSupplierCode())}
                  placeholder="Ex.: FORN-12345"
                  className="input-field mt-1 font-mono"
                  disabled={verificandoSupplierCode}
                />
              </div>
              <button
                type="button"
                onClick={handleVerificarSupplierCode}
                disabled={verificandoSupplierCode}
                className="btn-secondary rounded-lg px-4 py-2.5 font-medium disabled:opacity-50"
              >
                {verificandoSupplierCode ? "Verificando…" : "Verificar"}
              </button>
            </div>
            {produtoEncontrado && !editingId && (
              <div className="mt-4 rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
                <p className="font-medium text-amber-800">Produto já cadastrado</p>
                <p className="mt-1 text-sm text-amber-700">
                  {produtoEncontrado.name}
                  {produtoEncontrado.supplierCode && <span className="ml-2 font-mono text-amber-600">· {produtoEncontrado.supplierCode}</span>}
                </p>
                <p className="mt-0.5 text-sm text-slate-600">
                  Preço atual: R$ {produtoEncontrado.price.toFixed(2).replace(".", ",")} · O preço pode ter alterado.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={handleEditarProdutoEncontrado} className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 font-medium">
                    <Pencil className="h-4 w-4" aria-hidden />
                    Editar produto
                  </button>
                  <button type="button" onClick={handleVerificarOutro} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Verificar outro
                  </button>
                </div>
              </div>
            )}
            {supplierCodeInput.trim() && !verificandoSupplierCode && !produtoEncontrado && !editingId && (
              <p className="mt-3 text-sm text-emerald-700">
                Produto não encontrado. Você pode cadastrar abaixo.
              </p>
            )}
          </div>

          {/* Formulário de cadastro */}
          {mostrarFormulario && (
            <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-slate-200 bg-white p-4">
              {erroSubmit && <div className="mb-4"><Alert message={erroSubmit} variant="error" /></div>}
              {editingId && (
                <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  Editando produto. Altere os campos e salve.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-slate-700">Nome</label>
            <input
              id="name"
              {...register("name")}
              placeholder="Ex.: Anel Solitário"
              className="input-field mt-1"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor="supplierCode" className="block text-sm font-medium text-slate-700">Código do fornecedor</label>
            <input
              id="supplierCode"
              {...register("supplierCode")}
              placeholder="Ex.: FORN-12345"
              className="input-field mt-1 font-mono"
            />
            {errors.supplierCode && <p className="mt-1 text-sm text-red-600">{errors.supplierCode.message}</p>}
          </div>
          <div>
            <label htmlFor="costPrice" className="block text-sm font-medium text-slate-700">Custo (R$)</label>
            <Controller
              name="costPrice"
              control={control}
              render={({ field }) => {
                const display = currencyEdit?.field === "costPrice" ? currencyEdit.value : toBrCurrency(field.value);
                return (
                  <input
                    id="costPrice"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={display}
                    className="input-field mt-1"
                    onFocus={() => setCurrencyEdit({ field: "costPrice", value: toBrCurrency(field.value) || "" })}
                    onBlur={() => {
                      const n = fromBrCurrency(currencyEdit?.field === "costPrice" ? currencyEdit.value : display);
                      field.onChange(n);
                      setValue("costPrice", n);
                      setCurrencyEdit(null);
                    }}
                    onChange={(e) => {
                      const raw = sanitizeBrCurrencyInput(e.target.value);
                      const newCost = fromBrCurrency(raw);
                      setCurrencyEdit({ field: "costPrice", value: raw });
                      field.onChange(newCost);
                      setValue("costPrice", newCost);
                      setValue("price", newCost * (1 + profitMargin / 100));
                    }}
                  />
                );
              }}
            />
            {errors.costPrice && <p className="mt-1 text-sm text-red-600">{errors.costPrice.message}</p>}
          </div>
          <div>
            <label htmlFor="profitMargin" className="block text-sm font-medium text-slate-700">Margem de lucro (%)</label>
            <Controller
              name="profitMargin"
              control={control}
              render={({ field }) => {
                const display = currencyEdit?.field === "profitMargin" ? currencyEdit.value : toBrCurrency(field.value);
                return (
                  <input
                    id="profitMargin"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,0"
                    value={display}
                    className="input-field mt-1"
                    onFocus={() => setCurrencyEdit({ field: "profitMargin", value: toBrCurrency(field.value) || "" })}
                    onBlur={() => {
                      const n = fromBrCurrency(currencyEdit?.field === "profitMargin" ? currencyEdit.value : display);
                      field.onChange(n);
                      setValue("profitMargin", n);
                      setCurrencyEdit(null);
                    }}
                    onChange={(e) => {
                      const raw = sanitizeBrCurrencyInput(e.target.value);
                      const newMargin = fromBrCurrency(raw);
                      setCurrencyEdit({ field: "profitMargin", value: raw });
                      field.onChange(newMargin);
                      setValue("profitMargin", newMargin);
                      setValue("price", costPrice * (1 + newMargin / 100));
                    }}
                  />
                );
              }}
            />
            {errors.profitMargin && <p className="mt-1 text-sm text-red-600">{errors.profitMargin.message}</p>}
          </div>
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-slate-700">Preço de venda (R$)</label>
            <Controller
              name="price"
              control={control}
              render={({ field }) => {
                const display = currencyEdit?.field === "price" ? currencyEdit.value : toBrCurrency(field.value);
                return (
                  <input
                    id="price"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={display}
                    className="input-field mt-1"
                    onFocus={() => setCurrencyEdit({ field: "price", value: toBrCurrency(field.value) || "" })}
                    onBlur={() => {
                      const n = fromBrCurrency(currencyEdit?.field === "price" ? currencyEdit.value : display);
                      field.onChange(n);
                      setValue("price", n);
                      const margin = costPrice > 0 ? Math.round(((n / costPrice) - 1) * 10000) / 100 : 0;
                      setValue("profitMargin", Math.max(0, margin));
                      setCurrencyEdit(null);
                    }}
                    onChange={(e) => {
                      const raw = sanitizeBrCurrencyInput(e.target.value);
                      const newPrice = fromBrCurrency(raw);
                      setCurrencyEdit({ field: "price", value: raw });
                      field.onChange(newPrice);
                      setValue("price", newPrice);
                      const margin = costPrice > 0 ? Math.round(((newPrice / costPrice) - 1) * 10000) / 100 : 0;
                      setValue("profitMargin", Math.max(0, margin));
                    }}
                  />
                );
              }}
            />
            <p className="mt-0.5 text-xs text-slate-500">Edite para ajustar; a margem (%) será recalculada.</p>
            {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-slate-700">Descrição (opcional)</label>
            <textarea id="description" {...register("description")} placeholder="Ex.: Anel com várias pedras" rows={2} className="input-field mt-1 resize-none" />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
          </div>
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-primary mt-6 rounded-lg px-4 py-2.5 font-medium disabled:opacity-50">
          {isSubmitting ? "Salvando…" : editingId ? "Salvar alterações" : "Cadastrar produto"}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={handleCancelarEdicao}
            className="ml-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar edição
          </button>
        )}
            </form>
          )}
        </div>
      </section>

      {(produtoSelecionado || loadingDetalhe) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={fecharDetalhe}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="modal-title" className="text-lg font-semibold text-slate-800">Detalhes do produto</h2>
              <button
                type="button"
                onClick={fecharDetalhe}
                disabled={loadingDetalhe}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Fechar
              </button>
            </div>
            {erroDetalhe && <p className="mb-4 text-sm text-red-600" role="alert">{erroDetalhe}</p>}
            {loadingDetalhe ? (
              <p className="text-slate-500">Carregando detalhes…</p>
            ) : produtoSelecionado ? (
              <>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Nome</dt>
                    <dd className="mt-0.5 font-medium text-slate-800">{produtoSelecionado.name}</dd>
                  </div>
                  {produtoSelecionado.sku && (
                    <div>
                      <dt className="text-xs font-medium uppercase text-slate-500">SKU</dt>
                      <dd className="mt-0.5 font-mono text-slate-800">{produtoSelecionado.sku}</dd>
                    </div>
                  )}
                  {produtoSelecionado.supplierCode && (
                    <div>
                      <dt className="text-xs font-medium uppercase text-slate-500">Código do fornecedor</dt>
                      <dd className="mt-0.5 font-mono text-slate-800">{produtoSelecionado.supplierCode}</dd>
                    </div>
                  )}
                  {produtoSelecionado.barcode && (
                    <div>
                      <dt className="text-xs font-medium uppercase text-slate-500">Código de barras</dt>
                      <dd className="mt-0.5 font-mono text-slate-800">{produtoSelecionado.barcode}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Custo (R$)</dt>
                    <dd className="mt-0.5 text-slate-800">R$ {produtoSelecionado.costPrice.toFixed(2).replace(".", ",")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Preço de venda (R$)</dt>
                    <dd className="mt-0.5 text-slate-800">R$ {produtoSelecionado.price.toFixed(2).replace(".", ",")}</dd>
                  </div>
                  {produtoSelecionado.marginPercent != null && (
                    <div>
                      <dt className="text-xs font-medium uppercase text-slate-500">Margem (%)</dt>
                      <dd className="mt-0.5 text-slate-800">{produtoSelecionado.marginPercent}%</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Quantidade em estoque</dt>
                    <dd className="mt-0.5 text-slate-800">{produtoSelecionado.quantity}</dd>
                  </div>
                  {produtoSelecionado.description && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium uppercase text-slate-500">Descrição</dt>
                      <dd className="mt-0.5 text-slate-800">{produtoSelecionado.description}</dd>
                    </div>
                  )}
                  {produtoSelecionado.createdAt && (
                    <div>
                      <dt className="text-xs font-medium uppercase text-slate-500">Criado em</dt>
                      <dd className="mt-0.5 text-slate-600">{formatarData(produtoSelecionado.createdAt)}</dd>
                    </div>
                  )}
                  {produtoSelecionado.updatedAt && (
                    <div>
                      <dt className="text-xs font-medium uppercase text-slate-500">Atualizado em</dt>
                      <dd className="mt-0.5 text-slate-600">{formatarData(produtoSelecionado.updatedAt)}</dd>
                    </div>
                  )}
                </dl>
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <h3 className="mb-2 text-sm font-medium text-slate-700">Gerar etiqueta</h3>
                  {erroEtiqueta && <p className="mb-2 text-sm text-red-600">{erroEtiqueta}</p>}
                  {sucessoEtiqueta && <p className="mb-2 text-sm text-emerald-600">{sucessoEtiqueta}</p>}
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label htmlFor="qty-etiqueta-modal" className="block text-xs font-medium text-slate-500">Quantidade</label>
                      <input
                        id="qty-etiqueta-modal"
                        type="number"
                        min={1}
                        max={999}
                        value={qtyEtiqueta}
                        onChange={(e) => setQtyEtiqueta(e.target.value)}
                        className="input-field mt-1 w-24"
                        disabled={loadingEtiqueta}
                      />
                    </div>
                    <div>
                      <label htmlFor="model-etiqueta-modal" className="block text-xs font-medium text-slate-500">Layout</label>
                      <select
                        id="model-etiqueta-modal"
                        value={modelEtiqueta}
                        onChange={(e) => setModelEtiqueta(e.target.value as LabelModel)}
                        className="input-field mt-1 w-48"
                        disabled={loadingEtiqueta}
                      >
                        <option value="95x12">95×12 mm</option>
                        <option value="26x15x3">26×15×3</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleGerarEtiqueta}
                      disabled={loadingEtiqueta}
                      className="btn-secondary rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                    >
                      {loadingEtiqueta ? "Gerando…" : "Gerar etiqueta (PDF)"}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ——— SEÇÃO 3: ETIQUETAS ——— */}
      <section
        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        aria-labelledby="section-etiquetas"
      >
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
          <h2 id="section-etiquetas" className="text-lg font-semibold tracking-tight text-slate-800">
            Etiquetas
          </h2>
        </div>
        <div className="p-6">
          <LabelsPageClient initialProducts={produtos} embedded />
        </div>
      </section>
    </div>
  );
}
