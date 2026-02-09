import { z } from "zod";

export const skuFormSchema = z.object({
  sku: z.string().min(1, "Informe o código SKU").max(20),
  nome: z.string().min(1, "Informe o nome").max(100),
  preco: z.number().min(0, "Preço deve ser ≥ 0"),
  estoque: z.number().int().min(0, "Estoque deve ser ≥ 0"),
});

export type SkuFormValues = z.infer<typeof skuFormSchema>;
