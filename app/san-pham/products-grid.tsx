"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search, ShoppingCart, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import type { SkuProduct } from "@/app/api/sku-products/route";
import type { Locale } from "@/lib/site";
import type { CustomerSession } from "@/lib/customer-session";
import { useCustomerSession } from "@/lib/customer-session-context";

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
    { slug: "thiet-bi-bep", label: "🍳 Thiết bị bếp" },
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
    { slug: "thiet-bi-bep", label: "🍳 Kitchen equipment" },
  ]
};

const UI = {
  vi: {
    contact: "Liên hệ",
    unit: "Đơn vị: ",
    reference: "/tham khảo",
    added: "Đã thêm",
    addToCart: "Đưa vào DS báo giá",
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

const fmt = (n: number) =>
  n > 0
    ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n)
    : "";

// ─── Single product list row ────────────────────────────────────────────────────
function SkuRow({
  product,
  locale = "vi",
  session,
}: {
  product: SkuProduct;
  locale?: Locale;
  session: CustomerSession | null;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const text = UI[locale];

  const discountPercent = session?.discountPercent || 0;
  const finalPrice =
    product.price > 0 ? Math.round(product.price * (1 - discountPercent / 100)) : 0;

  const handleAdd = () => {
    const qty = parseFloat(quantity) || 1;
    // Lưu giá GỐC (chưa chiết khấu) vào giỏ — % chiết khấu luôn được server
    // tính lại từ session đã ký khi đặt hàng (/api/customer/order), tránh
    // trường hợp giỏ hàng đã lưu giá cũ trước khi đăng nhập hoặc lệch % nhóm.
    addItem(
      {
        slug: product.slug,
        title: product.name,
        summary: product.unit,
        price: product.price,
      },
      qty
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

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
          {product.price > 0 && discountPercent > 0 ? (
            <span className="sku-row__price sku-row__price--discount">
              <small className="sku-row__price-old">{fmt(product.price)}</small>
              <span className="sku-row__price-final">
                {fmt(finalPrice)}
                <small className="sku-row__price-badge">-{discountPercent}%</small>
              </span>
            </span>
          ) : (
            <span className="sku-row__price">
              {product.price > 0 ? (
                <>
                  {fmt(product.price)}
                  <small>{text.reference}</small>
                </>
              ) : (
                text.contact
              )}
            </span>
          )}
        </div>

        <div className="sku-row__action">
          <input
            type="number"
            min="0.1"
            step="any"
            className="sku-row__qty"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            aria-label={text.qty}
            title={text.qty}
          />
          <button
            type="button"
            className={`sku-row__add${added ? " is-added" : ""}`}
            onClick={handleAdd}
            aria-label={
              added
                ? text.added
                : session
                  ? `Thêm ${product.name} vào giỏ hàng`
                  : `Đưa ${product.name} vào danh sách báo giá`
            }
            title={added ? text.added : session ? "Thêm vào giỏ hàng" : text.addToCart}
          >
            {added ? <CheckCircle2 size={16} /> : <ShoppingCart size={16} />}
          </button>
        </div>
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
  const [totalPages, setTotalPages] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { session } = useCustomerSession();

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
      
      const data = await res.json();
      // data format: { products: SkuProduct[], totalCount: number, totalPages: number, page: number, pageSize: number }
      
      if (Array.isArray(data)) {
        // Fallback if API hasn't updated yet
        setProducts(data);
        setTotalPages(1);
      } else {
        setProducts(data.products || []);
        setTotalPages(data.totalPages || 1);
      }
      
      // Auto scroll to top of list
      const listTop = document.getElementById("sku-list-top");
      if (listTop && pg > 1) {
        // Smooth scroll might feel jumpy if image heights aren't pre-loaded, but should be fine.
        listTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
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
    
    for (let i = start; i <= end; i++) {
      pages.push(
        <button 
          key={i} 
          onClick={() => setPage(i)} 
          className={`sku-page-btn ${page === i ? 'is-active' : ''}`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="sku-pagination">
        <button 
          className="sku-page-btn" 
          disabled={page <= 1} 
          onClick={() => setPage(p => Math.max(1, p - 1))}
        >
          <ChevronLeft size={16} />
        </button>
        
        {start > 1 && (
          <>
            <button className="sku-page-btn" onClick={() => setPage(1)}>1</button>
            {start > 2 && <span className="sku-page-ellipsis">...</span>}
          </>
        )}
        
        {pages}
        
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="sku-page-ellipsis">...</span>}
            <button className="sku-page-btn" onClick={() => setPage(totalPages)}>{totalPages}</button>
          </>
        )}
        
        <button 
          className="sku-page-btn" 
          disabled={page >= totalPages} 
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  };

  return (
    <section className="sku-section">
      {/* Đăng nhập tài khoản VIP */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          background: session ? "rgba(27,122,61,0.08)" : "#fffbeb",
          border: `1px solid ${session ? "rgba(27,122,61,0.25)" : "#fde68a"}`,
          color: session ? "#1B7A3D" : "#92400e",
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 13,
          marginBottom: 16,
        }}
      >
        {session ? (
          <span>
            Đã đăng nhập <strong>{session.code}</strong> — giá đã áp chiết khấu{" "}
            <strong>{session.discountPercent}%</strong> ({session.tier})
          </span>
        ) : (
          <span>Đăng nhập bằng mã khách hàng để xem giá chiết khấu và đặt hàng.</span>
        )}
        <a
          href={session ? "/portal/gio-hang" : "/portal/dang-nhap"}
          style={{ fontWeight: 700, color: "inherit", textDecoration: "underline" }}
        >
          {session ? "Xem giỏ hàng →" : "Đăng nhập →"}
        </a>
      </div>

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
          <div className="sku-list">
            {products.map((p) => (
              <SkuRow key={p.id} product={p} locale={locale} session={session} />
            ))}
          </div>
          
          {renderPagination()}
        </>
      )}
    </section>
  );
}



