"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search, ShoppingCart, CheckCircle2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import type { SkuProduct } from "@/app/api/sku-products/route";
import type { Locale } from "@/lib/site";

// ─── Category tabs ─────────────────────────────────────────────────────────
const CATEGORIES: Record<Locale, { slug: string; label: string }[]> = {
  vi: [
    { slug: "", label: "Tất cả" },
    { slug: "rau-cu", label: "🥦 Rau củ quả" },
    { slug: "thit-heo", label: "🐷 Thịt heo" },
    { slug: "thit-bo", label: "🐄 Thịt bò nhập" },
    { slug: "ga-vit", label: "🐔 Gia cầm" },
    { slug: "hai-san", label: "🦐 Hải sản" },
    { slug: "dong-lanh", label: "❄️ Đông lạnh" },
    { slug: "gia-vi", label: "🫙 Gia vị" },
    { slug: "gao-mi", label: "🌾 Gạo, mì, khô" },
  ],
  en: [
    { slug: "", label: "All" },
    { slug: "rau-cu", label: "🥦 Produce" },
    { slug: "thit-heo", label: "🐷 Pork" },
    { slug: "thit-bo", label: "🐄 Imported Beef" },
    { slug: "ga-vit", label: "🐔 Poultry" },
    { slug: "hai-san", label: "🦐 Seafood" },
    { slug: "dong-lanh", label: "❄️ Frozen" },
    { slug: "gia-vi", label: "🫙 Seasonings" },
    { slug: "gao-mi", label: "🌾 Dry Goods" },
  ]
};

const UI = {
  vi: {
    contact: "Liên hệ",
    unit: "Đơn vị: ",
    reference: "/tham khảo",
    added: "Đã thêm",
    addToCart: "Thêm vào giỏ",
    searchPlaceholder: "Tìm tên sản phẩm... (vd: cá basa, thịt vai, cải thảo)",
    loadingProducts: "Đang tải sản phẩm...",
    empty: "Không tìm thấy sản phẩm phù hợp.",
    loadMore: "Xem thêm sản phẩm",
    loadingMore: "Đang tải..."
  },
  en: {
    contact: "Contact us",
    unit: "Unit: ",
    reference: "/reference",
    added: "Added",
    addToCart: "Add to quote",
    searchPlaceholder: "Search products... (e.g., basa fish, beef, cabbage)",
    loadingProducts: "Loading products...",
    empty: "No matching products found.",
    loadMore: "Load more products",
    loadingMore: "Loading..."
  }
};

const fmt = (n: number) =>
  n > 0
    ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n)
    : "";

// ─── Single product card ────────────────────────────────────────────────────
function SkuCard({ product, locale = "vi" }: { product: SkuProduct, locale?: Locale }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const text = UI[locale];

  const handleAdd = () => {
    addItem({
      slug: product.slug,
      title: product.name,
      summary: product.unit,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <article className="sku-card">
      <div className="sku-card__media">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="sku-card__img"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/images/tps1-cover-food.jpg";
          }}
        />
        <span className="sku-card__cat">{product.categoryLabel}</span>
      </div>
      <div className="sku-card__body">
        <h3 className="sku-card__name">{product.name}</h3>
        <div className="sku-card__meta">
          <span className="sku-card__unit">{text.unit}{product.unit}</span>
          <span className="sku-card__price">
            {product.price > 0 ? (
              <>
                {fmt(product.price)}<small>{text.reference}</small>
              </>
            ) : (
              text.contact
            )}
          </span>
        </div>
        <button
          type="button"
          className={`sku-card__add${added ? " is-added" : ""}`}
          onClick={handleAdd}
          aria-label={`Thêm ${product.name} vào giỏ`}
        >
          {added ? (
            <>
              <CheckCircle2 size={15} />
              {text.added}
            </>
          ) : (
            <>
              <ShoppingCart size={15} />
              {text.addToCart}
            </>
          )}
        </button>
      </div>
    </article>
  );
}

// ─── Products Grid (main export) ───────────────────────────────────────────
export function ProductsGrid({ locale = "vi" }: { locale?: Locale }) {
  const [products, setProducts] = useState<SkuProduct[]>([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // debounced
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const PAGE_SIZE = 60;
  const text = UI[locale];
  const catList = CATEGORIES[locale];

  // Debounce search input
  const handleSearch = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(val);
      setPage(1);
    }, 350);
  };

  const fetchProducts = useCallback(async (cat: string, q: string, pg: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg) });
      if (cat) params.set("category", cat);
      if (q.trim()) params.set("q", q.trim());

      const res = await fetch(`/api/sku-products?${params.toString()}`);
      if (!res.ok) throw new Error("fetch failed");
      const data: SkuProduct[] = await res.json();

      setProducts((prev) => (pg === 1 ? data : [...prev, ...data]));
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      if (pg === 1) setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload when category/query changes
  useEffect(() => {
    setPage(1);
    fetchProducts(category, query, 1);
  }, [category, query, fetchProducts]);

  // Load more when page changes (not first load)
  useEffect(() => {
    if (page > 1) fetchProducts(category, query, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <section className="sku-section">
      {/* Search */}
      <div className="sku-search-wrap">
        <Search size={17} className="sku-search-icon" />
        <input
          type="search"
          className="sku-search"
          placeholder={text.searchPlaceholder}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          aria-label={text.searchPlaceholder}
          id="sku-search-input"
        />
      </div>

      {/* Category tabs */}
      <div className="sku-tabs" role="tablist" aria-label="Nhóm hàng">
        {catList.map((cat) => (
          <button
            key={cat.slug}
            role="tab"
            aria-selected={category === cat.slug}
            type="button"
            className={`sku-tab${category === cat.slug ? " is-active" : ""}`}
            onClick={() => {
              setCategory(cat.slug);
              setPage(1);
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading && products.length === 0 ? (
        <div className="sku-loading">
          <div className="sku-spinner" />
          {text.loadingProducts}
        </div>
      ) : products.length === 0 ? (
        <div className="sku-empty">
          {text.empty}
        </div>
      ) : (
        <>
          <div className="sku-grid">
            {products.map((p) => (
              <SkuCard key={p.id} product={p} locale={locale} />
            ))}
          </div>
          {hasMore && (
            <div className="sku-load-more">
              <button
                type="button"
                className="btn-secondary"
                disabled={loading}
                onClick={() => setPage((p) => p + 1)}
              >
                {loading ? text.loadingMore : text.loadMore}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
