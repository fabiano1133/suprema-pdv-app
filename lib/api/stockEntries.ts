import { getApiUrl, throwApiError } from "./client";

/** Linha de entrada de estoque (item + quantidade). */
export interface StockEntryLine {
  itemId: string;
  quantity: number;
}

/** Pedido de entrada de estoque retornado pelo backend. */
export interface StockEntry {
  id: string;
  reference: string;
  supplier: string;
  lines: StockEntryLine[];
  createdAt?: string;
}

/** Body para criar entrada de estoque (nota/pedido). */
export interface CreateStockEntryBody {
  reference: string;
  supplier: string;
  lines: StockEntryLine[];
}

/** Body para atualizar entrada de estoque (nota/pedido). */
export interface UpdateStockEntryBody {
  reference: string;
  supplier: string;
  lines: StockEntryLine[];
}

/** Formato de item retornado pelo backend (pode variar). */
interface StockEntryDTO {
  id: string;
  reference?: string;
  supplier?: string;
  lines?: Array<{ itemId?: string; productId?: string; quantity?: number }>;
  createdAt?: string;
}

function mapStockEntry(dto: StockEntryDTO): StockEntry {
  const lines = (dto.lines ?? []).map((l) => ({
    itemId: l.itemId ?? l.productId ?? "",
    quantity: l.quantity ?? 0,
  }));
  return {
    id: dto.id,
    reference: dto.reference ?? "",
    supplier: dto.supplier ?? "",
    lines,
    createdAt: dto.createdAt,
  };
}

/**
 * Lista todos os pedidos de entrada de estoque.
 * GET /api/v1/stock-entries
 */
export async function fetchStockEntries(): Promise<StockEntry[]> {
  const url = getApiUrl("/api/v1/stock-entries");
  const res = await fetch(url);
  if (!res.ok) await throwApiError(res, "Erro ao listar pedidos.");
  const data = await res.json();
  const raw = Array.isArray(data) ? data : data.data ?? data.entries ?? [];
  return raw.map((d: StockEntryDTO) => mapStockEntry(d));
}

/**
 * Busca um pedido de entrada de estoque por id.
 * GET /api/v1/stock-entries/:id
 */
export async function fetchStockEntryById(id: string): Promise<StockEntry> {
  const url = getApiUrl(`/api/v1/stock-entries/${encodeURIComponent(id)}`);
  const res = await fetch(url);
  if (!res.ok) await throwApiError(res, "Erro ao buscar detalhes do pedido.");
  const dto: StockEntryDTO = await res.json();
  return mapStockEntry(dto);
}

/**
 * Cria uma entrada de estoque (nota/pedido) no backend.
 * POST /api/v1/stock-entries
 */
export async function createStockEntry(body: CreateStockEntryBody): Promise<void> {
  const url = getApiUrl("/api/v1/stock-entries");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reference: body.reference.trim(),
      supplier: body.supplier.trim(),
      lines: body.lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
    }),
  });
  if (!res.ok) await throwApiError(res, "Erro ao cadastrar pedido.");
}

/**
 * Atualiza uma entrada de estoque (nota/pedido) no backend.
 * PATCH /api/v1/stock-entries/:id
 */
export async function updateStockEntry(id: string, body: UpdateStockEntryBody): Promise<void> {
  const url = getApiUrl(`/api/v1/stock-entries/${encodeURIComponent(id)}`);
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reference: body.reference.trim(),
      supplier: body.supplier.trim(),
      lines: body.lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
    }),
  });
  if (!res.ok) await throwApiError(res, "Erro ao atualizar pedido.");
}
