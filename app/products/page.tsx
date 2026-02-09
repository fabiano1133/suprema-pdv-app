import { fetchProductsPaginated } from "@/lib/api/products";
import { ProductsPageClient } from "@/components/products";

export default async function ProductsPage() {
  let initialProducts: Awaited<ReturnType<typeof fetchProductsPaginated>>["data"] = [];
  let initialMeta: Awaited<ReturnType<typeof fetchProductsPaginated>>["meta"] | null = null;
  try {
    const result = await fetchProductsPaginated({ page: 1, limit: 5 });
    initialProducts = result.data;
    initialMeta = result.meta;
  } catch {
    initialProducts = [];
  }
  return (
    <ProductsPageClient
      initialProducts={initialProducts}
      initialMeta={initialMeta}
    />
  );
}
