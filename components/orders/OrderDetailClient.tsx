"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getTotalOrder } from "@/lib/services/orders";
import { fetchOrderById, addOrderItem, removeOrderItem, payOrder, type PaymentMethod } from "@/lib/api/orders";
import { findProductByBarcode } from "@/lib/api/products";
import type { Order, OrderItem } from "@/lib/types";
import { formatOrderStatusLabel } from "@/lib/utils/orderStatus";
import { ArrowLeft, Barcode, Plus, Banknote, CreditCard, RotateCcw } from "lucide-react";
import { BackLink } from "@/components/ui";
import { OrderHeader } from "./OrderHeader";
import { OrderItemsList } from "./OrderItemsList";
import { OrderTotalFooter } from "./OrderTotalFooter";

interface OrderDetailClientProps {
  orderId: string;
  initialOrder: Order | null;
}

export function OrderDetailClient({ orderId, initialOrder }: OrderDetailClientProps) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [loading, setLoading] = useState(!initialOrder);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [adicionando, setAdicionando] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [fechando, setFechando] = useState(false);
  const [showModalFechar, setShowModalFechar] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX");
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const focusBarcodeAfterScanRef = useRef(false);

  const recarregar = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setErroCarregar(null);
    try {
      const o = await fetchOrderById(orderId);
      setOrder(o);
    } catch (e) {
      setErroCarregar(e instanceof Error ? e.message : "Erro ao carregar comanda.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  useEffect(() => {
    if (!adicionando && focusBarcodeAfterScanRef.current) {
      focusBarcodeAfterScanRef.current = false;
      const el = barcodeInputRef.current;
      if (el) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => el.focus());
        });
      }
    }
  }, [adicionando]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <p className="text-slate-600">Carregando comanda…</p>
      </div>
    );
  }

  if (erroCarregar || order === null) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <p className="text-slate-600">{erroCarregar ?? "Comanda não encontrada."}</p>
        <Link href="/orders" className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 font-medium">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar
        </Link>
        {erroCarregar && (
          <button type="button" onClick={() => recarregar()} className="flex items-center gap-2 text-sm font-medium text-slate-600 underline">
            <RotateCcw className="h-4 w-4" aria-hidden />
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  const editavel = order.status === "OPEN" || order.status === "ABERTA";
  if (!editavel) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackLink href="/orders" />
          <h1 className="text-xl font-semibold text-slate-800">{order.codigo} ({formatOrderStatusLabel(order.status)})</h1>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-600">
          Esta comanda não está aberta para edição.
        </div>
      </div>
    );
  }

  const total = getTotalOrder(order);

  async function handleAdicionarPorBarcode(e: React.MouseEvent | React.FormEvent) {
    e.preventDefault();
    const barcode = barcodeInput.trim();
    if (!barcode) {
      setErro("Informe o código de barras.");
      return;
    }
    setErro(null);
    setAdicionando(true);
    try {
      const produto = await findProductByBarcode(barcode);
      if (!produto) {
        setErro("Produto não encontrado para o código de barras informado.");
        return;
      }
      await addOrderItem(orderId, produto.id, 1);
      await recarregar();
      focusBarcodeAfterScanRef.current = true;
      setBarcodeInput("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao adicionar produto.");
    } finally {
      setAdicionando(false);
    }
  }

  async function handleRemover(item: OrderItem) {
    setErro(null);
    /** Backend pode esperar id da linha ou id do produto (itemId) no path do DELETE. */
    const lineIdOrItemId = item.id ?? item.productId;
    if (!lineIdOrItemId) {
      setErro("Não foi possível remover: id da linha não disponível.");
      return;
    }
    setRemovendoId(lineIdOrItemId);
    try {
      await removeOrderItem(orderId, lineIdOrItemId);
      await recarregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao remover produto.");
    } finally {
      setRemovendoId(null);
    }
  }

  function handleAbrirModalFechar() {
    setErro(null);
    setShowModalFechar(true);
  }

  async function handleConfirmarFechar() {
    setErro(null);
    setFechando(true);
    try {
      await payOrder(orderId, paymentMethod);
      setShowModalFechar(false);
      router.push("/orders");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao fechar comanda.");
    } finally {
      setFechando(false);
    }
  }

  return (
    <div className="space-y-6">
      <OrderHeader order={order} />

      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
          <Barcode className="h-4 w-4" aria-hidden />
          Adicionar produto
        </h2>
        <div>
          <label htmlFor="order-barcode" className="block text-sm font-medium text-slate-700">
            Código de barras
          </label>
          <input
            ref={barcodeInputRef}
            id="order-barcode"
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdicionarPorBarcode(e);
              }
            }}
            placeholder="Leia ou digite o código de barras"
            className="input-field mt-1 font-mono"
            disabled={adicionando}
            autoComplete="off"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAdicionarPorBarcode}
            disabled={!barcodeInput.trim() || adicionando}
            className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {adicionando ? "Adicionando…" : (
            <>
              <Plus className="h-4 w-4" aria-hidden />
              Adicionar à comanda
            </>
          )}
          </button>
        </div>
        {erro && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {erro}
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-slate-600">Produtos da venda</h2>
        <OrderItemsList items={order.items} onRemover={handleRemover} removendoId={removendoId} />
      </section>

      <OrderTotalFooter
        total={total}
        onFechar={handleAbrirModalFechar}
        fechando={fechando}
      />

      {showModalFechar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-fechar-comanda-title"
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="modal-fechar-comanda-title" className="mb-4 text-lg font-semibold text-slate-800">
              Fechar comanda
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              Total: <span className="font-semibold text-slate-800">R$ {total.toFixed(2).replace(".", ",")}</span>
            </p>
            {erro && (
              <p className="mb-4 text-sm text-red-600" role="alert">
                {erro}
              </p>
            )}
            <div className="mb-6">
              <label htmlFor="modal-payment-method" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Banknote className="h-4 w-4" aria-hidden />
                Forma de pagamento
              </label>
              <select
                id="modal-payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                disabled={fechando}
                className="input-field mt-1 w-full"
              >
                <option value="PIX">PIX</option>
                <option value="MONEY">Dinheiro</option>
                <option value="CREDIT_CARD">Cartão de crédito</option>
                <option value="DEBIT_CARD">Cartão de débito</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowModalFechar(false)}
                disabled={fechando}
                className="btn-secondary flex-1 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarFechar}
                disabled={fechando}
                className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {fechando ? "Fechando…" : (
                  <>
                    <CreditCard className="h-4 w-4" aria-hidden />
                    Confirmar pagamento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
