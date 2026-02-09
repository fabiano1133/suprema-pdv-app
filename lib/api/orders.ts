import type { Order, OrderItem, OrderStatusFilter } from "@/lib/types";
import { getApiUrl, throwApiError } from "./client";

export interface OrdersFilters {
  status?: OrderStatusFilter;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/** Metadados de paginação retornados pelo backend. */
export interface OrdersMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Resposta paginada da listagem de orders. */
export interface FetchOrdersResult {
  data: Order[];
  meta: OrdersMeta;
}

/** Formato de linha (item da order) retornado pelo backend (API usa "lines"). */
interface OrderLineDTO {
  id?: string;
  lineId?: string;
  skuId?: number;
  productId?: number;
  itemId?: string;
  nome?: string;
  name?: string;
  productName?: string;
  precoUnitario?: number;
  unitPrice?: number;
  price?: number;
  quantidade?: number;
  quantity?: number;
  subtotal: number;
}

/** Formato de order retornado pelo backend. */
interface OrderDTO {
  id: string;
  comNumber: string;
  status: string;
  total: number;
  client?: string;
  paymentMethod?: string;
  lines: OrderLineDTO[];
  createdAt: string;
  updatedAt: string;
}

function mapLine(dto: OrderLineDTO): OrderItem {
  const productId = dto.itemId ?? String(dto.skuId ?? dto.productId ?? "");
  const nome = dto.nome ?? dto.name ?? dto.productName ?? "";
  const precoUnitario = dto.precoUnitario ?? dto.unitPrice ?? dto.price ?? 0;
  const quantidade = dto.quantidade ?? dto.quantity ?? 0;
  /** Id da linha para DELETE: backend pode enviar id, lineId ou itemId. */
  const id = dto.id ?? dto.lineId ?? dto.itemId;
  return {
    id,
    productId,
    nome,
    precoUnitario,
    quantidade,
    subtotal: dto.subtotal,
  };
}

function mapOrder(dto: OrderDTO): Order {
  return {
    id: dto.id,
    codigo: dto.comNumber,
    status: dto.status ?? "OPEN",
    clienteNome: dto.client,
    paymentMethod: dto.paymentMethod,
    items: (dto.lines ?? []).map(mapLine),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/**
 * Lista orders do backend com paginação.
 * GET /api/v1/orders
 * Retorno: { data: Order[], meta: { total, page, limit, totalPages, hasNextPage, hasPreviousPage } }
 */
export async function fetchOrders(filters?: OrdersFilters): Promise<FetchOrdersResult> {
  const params = new URLSearchParams();
  params.set("status", filters?.status ?? "ALL");
  params.set("startDate", filters?.startDate ?? "null");
  params.set("endDate", filters?.endDate ?? "null");
  if (filters?.page != null) params.set("page", String(filters.page));
  if (filters?.limit != null) params.set("limit", String(filters.limit));
  const url = getApiUrl("/api/v1/orders") + `?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) await throwApiError(res, `Erro ao listar orders: ${res.status}`);
  const json = await res.json();
  const raw = Array.isArray(json.data) ? json.data : json.orders ?? json.data ?? [];
  const data = raw.map((d: OrderDTO) => mapOrder(d));
  const meta: OrdersMeta = {
    total: json.meta?.total ?? data.length,
    page: json.meta?.page ?? 1,
    limit: json.meta?.limit ?? (raw.length || 10),
    totalPages: json.meta?.totalPages ?? 1,
    hasNextPage: json.meta?.hasNextPage ?? false,
    hasPreviousPage: json.meta?.hasPreviousPage ?? false,
  };
  return { data, meta };
}

/**
 * Cria uma nova order no backend.
 * POST /api/v1/orders
 */
export async function createOrder(client?: string): Promise<Order> {
  const url = getApiUrl("/api/v1/orders");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(client?.trim() ? { client: client.trim() } : {}),
  });
  if (!res.ok) await throwApiError(res, "Erro ao criar order.");
  const dto: OrderDTO = await res.json();
  return mapOrder(dto);
}

/**
 * Busca uma order por id no backend.
 * GET /api/v1/orders/:id
 */
export async function fetchOrderById(id: string): Promise<Order> {
  const url = getApiUrl(`/api/v1/orders/${encodeURIComponent(id)}`);
  const res = await fetch(url);
  if (!res.ok) await throwApiError(res, `Erro ao buscar order: ${res.status}`);
  const dto: OrderDTO = await res.json();
  return mapOrder(dto);
}

/**
 * Adiciona produto à order no backend.
 * POST /api/v1/orders/:id/items
 * Body da API: { itemId, quantity }
 */
export async function addOrderItem(
  orderId: string,
  productId: string,
  quantity: number
): Promise<void> {
  const url = getApiUrl(`/api/v1/orders/${encodeURIComponent(orderId)}/items`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: productId, quantity }),
  });
  if (!res.ok) await throwApiError(res, `Erro ao adicionar produto: ${res.status}`);
}

/**
 * Remove item (linha) da order no backend.
 * DELETE /api/v1/orders/:id/items/:lineId
 */
export async function removeOrderItem(orderId: string, lineId: string): Promise<void> {
  const url = getApiUrl(
    `/api/v1/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(lineId)}`
  );
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) await throwApiError(res, `Erro ao remover produto: ${res.status}`);
}

/** Forma de pagamento aceita pelo backend (PayOrderDto). */
export type PaymentMethod = "PIX" | "MONEY" | "CREDIT_CARD" | "DEBIT_CARD";

/**
 * Fecha/paga order no backend.
 * PATCH /api/v1/orders/:id/pay
 * Body obrigatório: { paymentMethod: "PIX" | "MONEY" | "CREDIT_CARD" | "DEBIT_CARD" }
 * Erros: 404, 400 (body inválido), 400 (comanda sem itens / estoque insuficiente – message na resposta).
 */
export async function payOrder(orderId: string, paymentMethod: PaymentMethod): Promise<Order> {
  const url = getApiUrl(`/api/v1/orders/${encodeURIComponent(orderId)}/pay`);
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentMethod }),
  });
  if (!res.ok) await throwApiError(res, "Erro ao fechar comanda.");
  const dto: OrderDTO = await res.json();
  return mapOrder(dto);
}

/**
 * Busca o PDF do resumo de vendas por data.
 * GET /api/v1/orders/summary/pdf?date=YYYY-MM-DD
 * Retorna o blob do PDF para abrir no utilitário de impressão.
 */
export async function fetchOrdersSummaryPdf(date: string): Promise<Blob> {
  const params = new URLSearchParams({ date });
  const url = getApiUrl("/api/v1/orders/summary/pdf") + `?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) await throwApiError(res, "Erro ao gerar resumo de vendas.");
  const blob = await res.blob();
  if (!blob.type.startsWith("application/pdf"))
    throw new Error("Resposta não é um PDF válido.");
  return blob;
}
