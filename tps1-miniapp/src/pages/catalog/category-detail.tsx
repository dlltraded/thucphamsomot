import HorizontalDivider from "@/components/horizontal-divider";
import ProductGrid from "@/components/product-grid";
import { useAtomValue } from "jotai";
import { categoriesState, customerAuthState } from "@/state";
import CategorySlider from "@/components/category-slider";
import { Suspense, useEffect, useState } from "react";
import { ProductGridSkeleton } from "../search";
import { EmptyCategory } from "@/components/empty";
import { useParams } from "react-router-dom";
import { fetchProductPage, type CatalogCategory } from "@/utils/catalog";
import type { Product } from "@/types";

function ProductList() {
  const { id } = useParams();
  const categories = useAtomValue(categoriesState);
  const customer = useAtomValue(customerAuthState);
  const category = categories.find((item) => String(item.id) === id) as CatalogCategory | undefined;
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!category) return;
    let cancelled = false;
    setLoading(true);
    setProducts([]);
    setPage(0);
    fetchProductPage({ category, sessionToken: customer?.orderSessionToken })
      .then((result) => {
        if (cancelled) return;
        setProducts(result.products);
        setTotal(result.total);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Không tải được sản phẩm theo danh mục", error);
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [category?.id, customer?.orderSessionToken]);

  const loadMore = async () => {
    if (!category || loading) return;
    const nextPage = page + 1;
    setLoading(true);
    try {
      const result = await fetchProductPage({
        page: nextPage,
        category,
        sessionToken: customer?.orderSessionToken,
      });
      setProducts((current) => [...current, ...result.products]);
      setPage(nextPage);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  };

  if (loading && products.length === 0) return <ProductGridSkeleton className="pt-4" />;

  if (!products.length) {
    return <EmptyCategory />;
  }

  return (
    <>
      <ProductGrid products={products} className="pt-4" />
      {products.length < total && (
        <div className="px-4 pb-8">
          <button
            className="w-full rounded-xl border border-primary bg-white py-3 text-sm font-semibold text-primary disabled:opacity-60"
            disabled={loading}
            onClick={loadMore}
          >
            {loading ? "Đang tải..." : `Xem thêm (${products.length}/${total})`}
          </button>
        </div>
      )}
    </>
  );
}

export default function CategoryDetailPage() {
  return (
    <div className="h-full flex flex-col bg-section">
      <CategorySlider />
      <HorizontalDivider />
      <div className="flex-1 overflow-y-auto">
        <Suspense fallback={<ProductGridSkeleton className="pt-4" />}>
          <ProductList />
        </Suspense>
      </div>
    </div>
  );
}
