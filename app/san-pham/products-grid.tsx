"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Search, ArrowRight, ChevronLeft, ChevronRight, X, SlidersHorizontal, PackageSearch } from "lucide-react";
import { SKU_GROUPS, type SkuPage, type SkuProduct } from "@/lib/sku-catalog";
import type { Locale } from "@/lib/site";

// ─── Category tabs ─────────────────────────────────────────────────────────
const CATEGORIES: Record<Locale, { slug: string; label: string }[]> = {
  vi: [{ slug: "", label: "Tất cả" }, ...SKU_GROUPS.map((group) => ({ slug: group.slug, label: group.label }))],
  en: [{ slug: "", label: "All" }, ...SKU_GROUPS.map((group) => ({ slug: group.slug, label: group.labelEn }))],
};

const UI = {
  vi: {
    contact: "Liên hệ",
    unit: "Đơn vị: ",
    reference: "/tham khảo",
    addToCart: "Nhận báo giá",
    searchPlaceholder: "Tìm tên sản phẩm... (vd: cá basa, thịt vai, cải thảo)",
    loadingProducts: "Đang tải sản phẩm...",
    empty: "Không tìm thấy sản phẩm phù hợp.",
    qty: "SL"
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
    qty: "Qty"
  }
};

// ─── Single product list row ────────────────────────────────────────────────────
export function SkuRow({
  product,
  locale = "vi",
}: {
  product: SkuProduct;
  locale?: Locale;
}) {
  const text = UI[locale];

  return (
    <article className="sku-row">
      <div className="sku-row__media">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
          className="sku-row__img"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/images/tps1-cover-food.jpg";
          }}
        />
      </div>

      <div className="sku-row__body">
        <div className="sku-row__info">
          <span className="sku-row__cat">{product.categoryLabel}</span>
          <h3 className="sku-row__name">{product.name}</h3>
        </div>

        <div className="sku-row__price-unit">
          <span className="sku-row__unit">{text.unit}{product.unit}</span>
          <span className="sku-row__price">Giá theo bảng riêng</span>
        </div>

        <div className="sku-row__action">
          <Link
            href={`/bao-gia?product=${encodeURIComponent(product.slug)}`}
            className="sku-row__add"
            aria-label={`${text.addToCart}: ${product.name}`}
            title={text.addToCart}
          >
            <span>{text.addToCart}</span><ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}

// ─── Products Grid (main export) ───────────────────────────────────────────
export function ProductsGrid({
  locale = "vi",
  initialData,
  basePath,
}: {
  locale?: Locale;
  // Server-rendered first page (unfiltered) so the catalog is in the initial HTML.
  initialData?: SkuPage;
  // Page URL used for crawlable pagination links, e.g. "/san-pham".
  basePath?: string;
}) {
  const [products, setProducts] = useState<SkuProduct[]>(initialData?.products ?? []);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // debounced
  const [loading, setLoading] = useState(!initialData);
  const [page, setPage] = useState(initialData?.page ?? 1);
  const [totalPages, setTotalPages] = useState(initialData?.totalPages ?? 1);
  const [totalCount, setTotalCount] = useState(initialData?.totalCount ?? 0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef(
    new Map<string, { products: SkuProduct[]; totalCount: number; totalPages: number }>(
      initialData ? [[`||${initialData.page}`, initialData]] : [],
    ),
  );
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
    const cacheKey = `${cat}|${q.trim().toLocaleLowerCase()}|${pg}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setProducts(cached.products);
      setTotalCount(cached.totalCount);
      setTotalPages(cached.totalPages);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg) });
      if (cat) params.set("category", cat);
      if (q.trim()) params.set("q", q.trim());

      const res = await fetch(`/api/sku-products?${params.toString()}`, { signal: controller.signal });
      if (!res.ok) throw new Error("fetch failed");
      
      const data = await res.json();
      // data format: { products: SkuProduct[], totalCount: number, totalPages: number, page: number, pageSize: number }
      
      if (Array.isArray(data)) {
        // Fallback if API hasn't updated yet
        setProducts(data);
        setTotalCount(data.length);
        setTotalPages(1);
      } else {
        const next = {
          products: data.products || [],
          totalCount: data.totalCount || 0,
          totalPages: data.totalPages || 1,
        };
        setProducts(next.products);
        setTotalCount(next.totalCount);
        setTotalPages(next.totalPages);
        cacheRef.current.set(cacheKey, next);
      }
      
      // Auto scroll to top of list
      const listTop = document.getElementById("sku-list-top");
      if (listTop && pg > 1) {
        // Smooth scroll might feel jumpy if image heights aren't pre-loaded, but should be fine.
        listTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setProducts([]);
      setTotalCount(0);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // Reload when category/query/page changes
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchProducts(category, query, page);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [category, query, page, fetchProducts]);

  // Pagination Generator
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    let pages = [];
    // Show max 5 pages around current
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    
    // Unfiltered pages are real links (?trang=n) so crawlers can walk the
    // catalog; clicks are still handled client-side.
    const linkable = Boolean(basePath) && !category && !query.trim();
    const pageButton = (target: number, content: ReactNode, opts: { active?: boolean; disabled?: boolean; label?: string } = {}) => {
      const className = `sku-page-btn${opts.active ? " is-active" : ""}`;
      if (opts.disabled) {
        return <button key={opts.label ?? target} className={className} disabled aria-label={opts.label}>{content}</button>;
      }
      if (linkable) {
        return (
          <a
            key={opts.label ?? target}
            href={target === 1 ? basePath : `${basePath}?trang=${target}`}
            className={className}
            aria-label={opts.label}
            aria-current={opts.active ? "page" : undefined}
            onClick={(e) => { e.preventDefault(); setPage(target); }}
          >
            {content}
          </a>
        );
      }
      return <button key={opts.label ?? target} className={className} aria-label={opts.label} onClick={() => setPage(target)}>{content}</button>;
    };

    for (let i = start; i <= end; i++) {
      pages.push(pageButton(i, i, { active: page === i }));
    }

    return (
      <div className="sku-pagination">
        {pageButton(Math.max(1, page - 1), <ChevronLeft size={16} />, { disabled: page <= 1, label: "Trang trước" })}

        {start > 1 && (
          <>
            {pageButton(1, 1)}
            {start > 2 && <span className="sku-page-ellipsis">...</span>}
          </>
        )}

        {pages}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="sku-page-ellipsis">...</span>}
            {pageButton(totalPages, totalPages)}
          </>
        )}

        {pageButton(Math.min(totalPages, page + 1), <ChevronRight size={16} />, { disabled: page >= totalPages, label: "Trang sau" })}
      </div>
    );
  };

  return (
    <section className="sku-section" id="danh-muc">
      <div className="sku-section__inner">
        <div className="sku-section__intro">
          <div><span>CATALOG TPS1</span><h2>Chọn nhóm hàng phù hợp với bếp</h2></div>
          <p>Danh mục dùng để tham khảo nguồn hàng. Giá chính thức được thiết lập theo sản lượng và bảng giá riêng của từng khách hàng.</p>
        </div>

        <div className="sku-controls">
          <div className="sku-search-wrap">
            <Search size={20} className="sku-search-icon" />
            <input
              type="search"
              className="sku-search"
              placeholder={text.searchPlaceholder}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              aria-label={text.searchPlaceholder}
              id="sku-search-input"
            />
            {search && <button type="button" className="sku-search-clear" onClick={() => handleSearch("")} aria-label="Xóa nội dung tìm kiếm"><X size={17} /></button>}
          </div>

          <div className="sku-tabs-wrap">
            <SlidersHorizontal size={17} aria-hidden="true" />
            <div className="sku-tabs" role="tablist" aria-label="Nhóm hàng">
              {catList.map((cat) => (
                <button
                  key={cat.slug}
                  role="tab"
                  aria-selected={category === cat.slug}
                  type="button"
                  className={`sku-tab${category === cat.slug ? " is-active" : ""}`}
                  onClick={() => { setCategory(cat.slug); setPage(1); }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sku-results-head">
          <div><PackageSearch size={18} /><span>{loading && products.length === 0 ? "Đang cập nhật danh mục" : `${totalCount.toLocaleString("vi-VN")} sản phẩm`}</span></div>
          <a href="https://dathang.thucphamsomot.vn/">Đăng nhập để xem giá & đặt hàng <ArrowRight size={16} /></a>
        </div>

      <div id="sku-list-top" className="sku-list-anchor" style={{ position: 'relative', top: '-100px' }}></div>

      {/* List */}
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
          <div className={`sku-list${loading ? " is-loading" : ""}`} aria-busy={loading}>
            {products.map((p) => (
              <SkuRow key={p.id} product={p} locale={locale} />
            ))}
          </div>
          
          {renderPagination()}
        </>
      )}
      </div>
    </section>
  );
}



