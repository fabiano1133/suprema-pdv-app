import { fetchProducts } from "@/lib/api/products";
import { StockCountsPageClient } from "@/components/stock-counts";

export default async function StockCountsPage() {
  let initialProducts: Awaited<ReturnType<typeof fetchProducts>> = [];
  try {
    initialProducts = await fetchProducts();
  } catch {
    initialProducts = [];
  }
  return <StockCountsPageClient initialProducts={initialProducts} />;
}
