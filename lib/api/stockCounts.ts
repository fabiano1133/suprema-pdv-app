import { getApiUrl, throwApiError } from "./client";

export type StockCountStatus = "IN_PROGRESS" | "FINALIZED";

/** Linha do balanço (em progresso: só contagem; finalizado: + sistema e variância). */
export interface StockCountLine {
  itemId: string;
  countedQuantity: number;
  systemQuantity?: number;
  variance?: number;
}

/** Balanço de estoque (conferência). */
export interface StockCount {
  id: string;
  status: StockCountStatus;
  lines: StockCountLine[];
  createdAt: string;
  finalizedAt?: string;
  name?: string;
  description?: string;
}

/** Body para criar balanço. */
export interface CreateStockCountBody {
  name: string;
  description?: string;
}

/** Body para registrar scan. */
export interface AddScanBody {
  itemId: string;
  quantity: number;
}

/** Resposta do backend (linhas podem vir com nomes diferentes). */
interface StockCountDTO {
  id: string;
  status?: string;
  lines?: Array<{
    itemId?: string;
    productId?: string;
    countedQuantity?: number;
    systemQuantity?: number;
    variance?: number;
  }>;
  createdAt?: string;
  finalizedAt?: string;
  name?: string;
  description?: string;
}

function mapLine(dto: NonNullable<StockCountDTO["lines"]>[0]): StockCountLine {
  const itemId = dto?.itemId ?? dto?.productId ?? "";
  return {
    itemId,
    countedQuantity: dto?.countedQuantity ?? 0,
    systemQuantity: dto?.systemQuantity,
    variance: dto?.variance,
  };
}

function mapStockCount(dto: StockCountDTO): StockCount {
  const lines = (dto.lines ?? []).map(mapLine);
  return {
    id: dto.id,
    status: (dto.status === "FINALIZED" ? "FINALIZED" : "IN_PROGRESS") as StockCountStatus,
    lines,
    createdAt: dto.createdAt ?? "",
    finalizedAt: dto.finalizedAt,
    name: dto.name,
    description: dto.description,
  };
}

/**
 * Cria um novo balanço.
 * POST /api/v1/stock-counts
 * Body: { name, description? }
 */
export async function createStockCount(body: CreateStockCountBody): Promise<StockCount> {
  const url = getApiUrl("/api/v1/stock-counts");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
    }),
  });
  if (!res.ok) await throwApiError(res, "Erro ao criar balanço.");
  const dto: StockCountDTO = await res.json();
  return mapStockCount(dto);
}

/**
 * Registra coleta (scan) de item no balanço.
 * POST /api/v1/stock-counts/:id/scans
 */
export async function addStockCountScan(id: string, body: AddScanBody): Promise<StockCount> {
  const url = getApiUrl(`/api/v1/stock-counts/${encodeURIComponent(id)}/scans`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: body.itemId, quantity: body.quantity }),
  });
  if (!res.ok) await throwApiError(res, "Erro ao registrar scan.");
  const dto: StockCountDTO = await res.json();
  return mapStockCount(dto);
}

/**
 * Finaliza balanço e calcula variâncias.
 * PATCH /api/v1/stock-counts/:id/finalize
 */
export async function finalizeStockCount(id: string): Promise<StockCount> {
  const url = getApiUrl(`/api/v1/stock-counts/${encodeURIComponent(id)}/finalize`);
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) await throwApiError(res, "Erro ao finalizar balanço.");
  const dto: StockCountDTO = await res.json();
  return mapStockCount(dto);
}

/**
 * Busca balanço por ID.
 * GET /api/v1/stock-counts/:id
 */
export async function fetchStockCountById(id: string): Promise<StockCount> {
  const url = getApiUrl(`/api/v1/stock-counts/${encodeURIComponent(id)}`);
  const res = await fetch(url);
  if (!res.ok) await throwApiError(res, "Erro ao buscar balanço.");
  const dto: StockCountDTO = await res.json();
  return mapStockCount(dto);
}

/**
 * Lista todos os balanços.
 * GET /api/v1/stock-counts
 */
export async function fetchStockCounts(): Promise<StockCount[]> {
  const url = getApiUrl("/api/v1/stock-counts");
  const res = await fetch(url);
  if (!res.ok) await throwApiError(res, "Erro ao listar balanços.");
  const data = await res.json();
  const raw = Array.isArray(data) ? data : data.data ?? data.items ?? [];
  return raw.map((d: StockCountDTO) => mapStockCount(d));
}
