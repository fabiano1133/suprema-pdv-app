"use client";

import type { Sku } from "@/lib/types";
import { initialSkus } from "@/lib/mocks/initialData";

let skus: Sku[] = [...initialSkus];
let nextId = Math.max(0, ...initialSkus.map((s) => s.id)) + 1;

export function getAllSkus(): Sku[] {
  return [...skus];
}

export function getSkuById(id: number): Sku | undefined {
  return skus.find((s) => s.id === id);
}

export function getSkusBySearch(query: string): Sku[] {
  const q = query.trim().toLowerCase();
  if (!q) return skus;
  return skus.filter(
    (s) =>
      s.sku.toLowerCase().includes(q) ||
      s.nome.toLowerCase().includes(q)
  );
}

export function createSku(data: Omit<Sku, "id">): Sku {
  const novo: Sku = { ...data, id: nextId++ };
  skus.push(novo);
  return novo;
}

export function updateSku(id: number, data: Partial<Omit<Sku, "id">>): Sku | undefined {
  const idx = skus.findIndex((s) => s.id === id);
  if (idx === -1) return undefined;
  skus[idx] = { ...skus[idx], ...data };
  return skus[idx];
}

export function getEstoqueDisponivel(skuId: number): number {
  const s = skus.find((s) => s.id === skuId);
  return s?.estoque ?? 0;
}

export function reservarEstoque(skuId: number, quantidade: number): boolean {
  const s = skus.find((s) => s.id === skuId);
  if (!s || s.estoque < quantidade) return false;
  s.estoque -= quantidade;
  return true;
}

export function devolverEstoque(skuId: number, quantidade: number): void {
  const s = skus.find((s) => s.id === skuId);
  if (s) s.estoque += quantidade;
}
