import { fetchProducts } from "@/lib/api/products";
import { LabelsPageClient } from "@/components/labels";

export default async function LabelsPage() {
  let initialProducts: Awaited<ReturnType<typeof fetchProducts>> = [];
  try {
    initialProducts = await fetchProducts();
  } catch {
    initialProducts = [];
  }
  return <LabelsPageClient initialProducts={initialProducts} />;
}
