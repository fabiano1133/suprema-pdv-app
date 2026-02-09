import { z } from "zod";

/** Schema do formulário de produto. Preço de venda editável; margem (%) derivada ao alterar o preço. */
export const productFormSchema = z.object({
  name: z.string().min(1, "Informe o nome").max(200),
  costPrice: z.number().min(0, "Custo deve ser ≥ 0"),
  profitMargin: z.number().min(0, "Margem (%) deve ser ≥ 0"),
  price: z.number().min(0, "Preço de venda deve ser ≥ 0"),
  supplierCode: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
