// Semijoia (SKU) - produto cadastrado (mock/local; use Product para backend)
export interface Sku {
  id: number;
  uuid?: string;
  sku: string;
  nome: string;
  preco: number;
  estoque: number;
}

/** Produto do backend (SKU gerado automaticamente). Linguagem ubíqua DDD: products. */
export interface Product {
  id: string;
  name: string;
  costPrice: number;
  price: number;
  quantity: number;
  description?: string;
  /** SKU gerado pelo backend. */
  sku?: string;
  /** Margem em percentual (vem do backend). */
  marginPercent?: number;
  /** Código de barras (gerado pelo backend). */
  barcode?: string;
  /** Código do fornecedor. */
  supplierCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Item do pedido (linha da venda). */
export interface OrderItem {
  /** Id da linha no backend (usado para remover item da order). */
  id?: string;
  /** Id do produto no backend (UUID). */
  productId: string;
  nome: string;
  precoUnitario: number;
  quantidade: number;
  subtotal: number;
}

// Status da order (front/local mock)
export type OrderStatusLocal = "ABERTA" | "FECHADA";

/** Status de pedido aceitos pelo backend (filtro e resposta). */
export type OrderStatus = "OPEN" | "PAID" | "CANCELLED" | "REFUNDED";

/** Valor de filtro de status (ALL = listar todos, padrão na listagem). */
export type OrderStatusFilter = OrderStatus | "ALL";

/** Order (pedido no backend). */
export interface Order {
  id: string;
  codigo: string;
  status: string;
  clienteNome?: string;
  items: OrderItem[];
  /** Forma de pagamento (preenchido quando status = PAID). */
  paymentMethod?: string;
  /** Data de criação (ISO). */
  createdAt?: string;
  /** Data da última atualização (ex.: fechamento/pagamento). */
  updatedAt?: string;
}

// Etiqueta modelo BOPP (mock visual; código de barras mockado como se viesse do backend). Linguagem ubíqua DDD: etiquetas.
export interface Etiqueta {
  nome: string;
  sku: string;
  codigoPeca: string;
  /** Código de barras EAN-13 (gerado pelo backend; mock nesta fase) */
  codigoBarras: string;
}
