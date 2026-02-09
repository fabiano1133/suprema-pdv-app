import type { Sku, Order } from "@/lib/types";

// Estoque já descontado dos produtos nas orders iniciais (BRC 2, COL 1, PUL 1)
export const initialSkus: Sku[] = [
  { id: 1, sku: "BRC-001", nome: "Brinco Pérola Dourado", preco: 29.9, estoque: 48 },
  { id: 2, sku: "COL-002", nome: "Colar Prata Coração", preco: 45.0, estoque: 29 },
  { id: 3, sku: "PUL-003", nome: "Pulseira Tennis Prata", preco: 89.9, estoque: 19 },
  { id: 4, sku: "ANE-004", nome: "Anel Flor Dourado", preco: 35.0, estoque: 40 },
  { id: 5, sku: "BRC-005", nome: "Brinco Argola Prata", preco: 22.5, estoque: 60 },
];

export const initialOrders: Order[] = [
  {
    id: "1",
    codigo: "CMD-001",
    status: "ABERTA",
    clienteNome: "Maria Silva",
    items: [
      { productId: "1", nome: "Brinco Pérola Dourado", precoUnitario: 29.9, quantidade: 2, subtotal: 59.8 },
      { productId: "2", nome: "Colar Prata Coração", precoUnitario: 45.0, quantidade: 1, subtotal: 45.0 },
    ],
  },
  {
    id: "2",
    codigo: "CMD-002",
    status: "FECHADA",
    items: [
      { productId: "3", nome: "Pulseira Tennis Prata", precoUnitario: 89.9, quantidade: 1, subtotal: 89.9 },
    ],
  },
  {
    id: "3",
    codigo: "CMD-003",
    status: "ABERTA",
    items: [],
  },
];
