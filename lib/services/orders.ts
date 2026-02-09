"use client";

import type { Order, OrderItem, OrderStatusLocal } from "@/lib/types";
import { initialOrders } from "@/lib/mocks/initialData";
import {
  getSkuById,
  getEstoqueDisponivel,
  reservarEstoque,
  devolverEstoque,
} from "./skus";

let orders: Order[] = JSON.parse(JSON.stringify(initialOrders));
let nextId = 4;
let nextCodigo = 1000;

function gerarCodigo(): string {
  return `CMD-${String(nextCodigo++).padStart(3, "0")}`;
}

export function getAllOrders(): Order[] {
  return JSON.parse(JSON.stringify(orders));
}

export function getOrdersByStatus(status: OrderStatusLocal | "TODAS"): Order[] {
  const list = getAllOrders();
  if (status === "TODAS") return list;
  return list.filter((o) => o.status === status);
}

export function getOrderById(id: string): Order | undefined {
  const o = orders.find((o) => o.id === id);
  return o ? JSON.parse(JSON.stringify(o)) : undefined;
}

export function createOrder(clienteNome?: string): Order {
  const nova: Order = {
    id: String(nextId++),
    codigo: gerarCodigo(),
    status: "ABERTA",
    clienteNome: clienteNome?.trim() || undefined,
    items: [],
  };
  orders.push(nova);
  return nova;
}

export function addItemToOrder(orderId: string, skuId: number, quantidade: number): { ok: boolean; message?: string } {
  const order = orders.find((o) => o.id === orderId);
  if (!order || order.status !== "ABERTA") return { ok: false, message: "Order não encontrada ou já fechada." };

  const sku = getSkuById(skuId);
  if (!sku) return { ok: false, message: "SKU não encontrado." };

  const estoque = getEstoqueDisponivel(skuId);
  const productId = String(skuId);
  const itemExistente = order.items.find((p) => p.productId === productId);
  const qtyAtual = itemExistente?.quantidade ?? 0;
  const qtyTotal = qtyAtual + quantidade;

  if (qtyTotal > estoque) return { ok: false, message: `Estoque insuficiente. Disponível: ${estoque}` };

  if (itemExistente) {
    if (!reservarEstoque(skuId, quantidade)) return { ok: false, message: "Falha ao reservar estoque." };
    itemExistente.quantidade = qtyTotal;
    itemExistente.subtotal = itemExistente.precoUnitario * qtyTotal;
  } else {
    if (!reservarEstoque(skuId, quantidade)) return { ok: false, message: "Falha ao reservar estoque." };
    order.items.push({
      productId,
      nome: sku.nome,
      precoUnitario: sku.preco,
      quantidade,
      subtotal: sku.preco * quantidade,
    });
  }
  return { ok: true };
}

export function updateItemQuantidade(orderId: string, skuId: number, novaQuantidade: number): { ok: boolean; message?: string } {
  const order = orders.find((o) => o.id === orderId);
  if (!order || order.status !== "ABERTA") return { ok: false, message: "Order não encontrada ou já fechada." };

  const productId = String(skuId);
  const item = order.items.find((p) => p.productId === productId);
  if (!item) return { ok: false, message: "Produto não encontrado na order." };

  const estoque = getEstoqueDisponivel(skuId);
  const delta = novaQuantidade - item.quantidade;

  if (novaQuantidade <= 0) {
    devolverEstoque(skuId, item.quantidade);
    order.items = order.items.filter((p) => p.productId !== productId);
    return { ok: true };
  }

  if (delta > 0 && novaQuantidade > estoque + item.quantidade) return { ok: false, message: `Estoque insuficiente. Disponível: ${estoque}` };

  if (delta > 0) reservarEstoque(skuId, delta);
  else if (delta < 0) devolverEstoque(skuId, -delta);

  item.quantidade = novaQuantidade;
  item.subtotal = item.precoUnitario * novaQuantidade;
  return { ok: true };
}

export function removeItemFromOrder(orderId: string, skuId: number): boolean {
  const order = orders.find((o) => o.id === orderId);
  if (!order || order.status !== "ABERTA") return false;

  const productId = String(skuId);
  const item = order.items.find((p) => p.productId === productId);
  if (!item) return false;

  devolverEstoque(skuId, item.quantidade);
  order.items = order.items.filter((p) => p.productId !== productId);
  return true;
}

export function closeOrder(orderId: string): boolean {
  const order = orders.find((o) => o.id === orderId);
  if (!order || order.status !== "ABERTA") return false;
  order.status = "FECHADA";
  return true;
}

export function getTotalOrder(order: Order): number {
  return order.items.reduce((s, p) => s + p.subtotal, 0);
}
