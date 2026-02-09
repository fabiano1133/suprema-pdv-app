import { fetchProducts } from "@/lib/api/products";
import { StockEntriesPageClient } from "@/components/stock-entries";

export default async function StockEntriesPage() {
  let initialProducts: Awaited<ReturnType<typeof fetchProducts>> = [];
  try {
    initialProducts = await fetchProducts();
  } catch {
    initialProducts = [];
  }
  return <StockEntriesPageClient initialProducts={initialProducts} />;
}
