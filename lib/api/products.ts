import type { Product } from "@/lib/types";
import { getApiUrl, throwApiError } from "./client";

/** Body para criar produto no backend (SKU e barcode gerados automaticamente). Linguagem ubíqua: products. */
export interface CreateProductBody {
  name: string;
  costPrice: number;
  price: number;
  supplierCode?: string;
  description?: string;
}

/** Body para atualizar produto no backend. */
export interface UpdateProductBody {
  name?: string;
  costPrice?: number;
  price?: number;
  supplierCode?: string;
  description?: string;
}

/** Metadados de paginação retornados pelo backend. */
export interface ProductsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Resposta paginada da listagem de produtos. */
export interface FetchProductsResult {
  data: Product[];
  meta: ProductsMeta;
}

/** Formato de produto retornado pelo backend (API ainda usa "items"). */
interface ProductDTO {
  id: string;
  name: string;
  costPrice: number;
  price: number;
  quantity: number;
  description?: string;
  sku?: string;
  marginPercent?: number;
  barcode?: string;
  supplierCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

function mapProduct(dto: ProductDTO): Product {
  return {
    id: dto.id,
    name: dto.name,
    costPrice: dto.costPrice ?? 0,
    price: dto.price,
    quantity: dto.quantity,
    description: dto.description,
    sku: dto.sku,
    marginPercent: dto.marginPercent,
    barcode: dto.barcode,
    supplierCode: dto.supplierCode,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/**
 * Lista todos os produtos do backend (sem paginação).
 * GET /api/v1/items?page=null&search={termo} — backend retorna todos os itens quando page=null.
 * Usado por Labels, StockEntries, findProductByBarcode, etc.
 */
export async function fetchProducts(search?: string): Promise<Product[]> {
  const params = new URLSearchParams({ page: "null" });
  if (search?.trim()) params.set("search", search.trim());
  const url = getApiUrl("/api/v1/items") + `?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) await throwApiError(res, `Erro ao listar produtos: ${res.status}`);
  const json = await res.json();
  const raw = Array.isArray(json) ? json : json.items ?? json.data ?? [];
  return raw.map((d: ProductDTO) => mapProduct(d));
}

/**
 * Lista produtos do backend com paginação.
 * GET /api/v1/items?page=&limit=&search=
 * Retorno: { data: Product[], meta: { total, page, limit, totalPages, hasNextPage, hasPreviousPage } }
 */
export async function fetchProductsPaginated(params: { page: number; limit: number; search?: string }): Promise<FetchProductsResult> {
  const search = new URLSearchParams();
  search.set("page", String(params.page));
  search.set("limit", String(params.limit));
  if (params.search?.trim()) search.set("search", params.search.trim());
  const url = getApiUrl("/api/v1/items") + `?${search.toString()}`;
  const res = await fetch(url);
  if (!res.ok) await throwApiError(res, `Erro ao listar produtos: ${res.status}`);
  const json = await res.json();
  const raw = Array.isArray(json.data) ? json.data : json.items ?? json.data ?? [];
  const data = raw.map((d: ProductDTO) => mapProduct(d));
  const meta: ProductsMeta = {
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
 * Cria um produto no backend (SKU e barcode gerados automaticamente).
 * POST /api/v1/items
 * Body: { name, costPrice, price, supplierCode?, description? }
 */
export async function createProduct(body: CreateProductBody): Promise<Product> {
  const url = getApiUrl("/api/v1/items");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: body.name.trim(),
      costPrice: body.costPrice,
      price: body.price,
      supplierCode: body.supplierCode?.trim() || undefined,
      description: body.description?.trim() || undefined,
    }),
  });
  if (!res.ok) await throwApiError(res, "Erro ao cadastrar produto.");
  const dto: ProductDTO = await res.json();
  return mapProduct(dto);
}

/**
 * Busca um produto por id no backend.
 * GET /api/v1/items/:id
 */
export async function fetchProductById(id: string): Promise<Product> {
  const url = getApiUrl(`/api/v1/items/${encodeURIComponent(id)}`);
  const res = await fetch(url);
  if (!res.ok) await throwApiError(res, "Erro ao buscar produto.");
  const dto: ProductDTO = await res.json();
  return mapProduct(dto);
}

/**
 * Atualiza um produto no backend.
 * PATCH /api/v1/items/:id
 * Body: { name, costPrice, price, supplierCode?, description? }
 */
export async function updateProduct(id: string, body: UpdateProductBody): Promise<Product> {
  const url = getApiUrl(`/api/v1/items/${encodeURIComponent(id)}`);
  const payload: Record<string, unknown> = {
    name: body.name?.trim() ?? "",
    costPrice: body.costPrice ?? 0,
    price: body.price ?? 0,
    description: body.description?.trim() ?? "",
  };
  if (body.supplierCode !== undefined) {
    payload.supplierCode = body.supplierCode.trim() || undefined;
  }
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await throwApiError(res, "Erro ao atualizar produto.");
  const text = await res.text();
  if (!text.trim()) {
    return fetchProductById(id);
  }
  const dto: ProductDTO = JSON.parse(text);
  return mapProduct(dto);
}

/** Normaliza código de barras para comparação (apenas dígitos, pad 13 para EAN-13). Aceita string ou number. */
function normalizeBarcode(value: string | number): string {
  const digits = String(value).trim().replace(/\D/g, "");
  return digits.length > 0 ? digits.padStart(13, "0").slice(-13) : "";
}

/**
 * Busca produto por código de barras (lista produtos e filtra no front).
 * Compara por igualdade exata (trim) e por normalização (dígitos, EAN-13) para leitor e backend baterem.
 * Aceita barcode vindo como string ou number da API.
 */
export async function findProductByBarcode(barcode: string): Promise<Product | null> {
  const list = await fetchProducts();
  const barcodeTrim = String(barcode).trim();
  if (!barcodeTrim) return null;
  const normalized = normalizeBarcode(barcodeTrim);
  return (
    list.find((p) => {
      const pb = p.barcode;
      if (pb == null || String(pb).trim() === "") return false;
      const pbStr = String(pb).trim();
      if (pbStr === barcodeTrim) return true;
      if (normalized && normalizeBarcode(pbStr) === normalized) return true;
      return false;
    }) ?? null
  );
}

/**
 * Busca produto por SKU (lista produtos e filtra no front).
 * Compara com trim; aceita bipe/leitura do scanner.
 */
export async function findProductBySku(sku: string): Promise<Product | null> {
  const list = await fetchProducts();
  const normalized = sku.trim();
  if (!normalized) return null;
  return list.find((p) => p.sku?.trim() === normalized) ?? null;
}

/**
 * Busca produto por código do fornecedor (lista produtos e filtra no front).
 * Compara com trim (case-sensitive).
 */
export async function findProductBySupplierCode(supplierCode: string): Promise<Product | null> {
  const list = await fetchProducts();
  const normalized = supplierCode.trim();
  if (!normalized) return null;
  return list.find((p) => p.supplierCode?.trim() === normalized) ?? null;
}

/** Pedido de etiqueta (produto + quantidade). Linguagem ubíqua: etiquetas + products. */
export interface PedidoEtiqueta {
  productId: string;
  quantity: number;
}

/** Modelos de etiqueta aceitos pelo backend: 95x12 (padrão) ou 26x15x3 (3 por linha). */
export type LabelModel = "95x12" | "26x15x3";

/** Body para gerar PDF de etiquetas. Linguagem ubíqua: etiquetas. */
export interface GenerateEtiquetasPdfBody {
  produtos: PedidoEtiqueta[];
  /** Se omitido, o backend usa 95x12. */
  model?: LabelModel;
}

/**
 * Gera PDF de etiquetas no backend.
 * POST /api/v1/items/labels/pdf
 * Body: { items: [{ itemId, quantity }], model?: "95x12" | "26x15x3" }
 */
export async function generateEtiquetasPdf(body: GenerateEtiquetasPdfBody): Promise<Blob> {
  const url = getApiUrl("/api/v1/items/labels/pdf");
  const payload: { items: { itemId: string; quantity: number }[]; model?: LabelModel } = {
    items: body.produtos.map((p) => ({ itemId: p.productId, quantity: p.quantity })),
  };
  if (body.model) payload.model = body.model;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await throwApiError(res, "Erro ao gerar etiquetas PDF.");
  let blob = await res.blob();
  const contentType = blob.type || res.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/pdf")) {
    throw new Error("Resposta não é um PDF válido.");
  }
  if (!blob.type || !blob.type.startsWith("application/pdf")) {
    blob = new Blob([blob], { type: "application/pdf" });
  }
  return blob;
}
