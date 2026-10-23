import { ChevronLeft, ChevronRight } from "lucide-react";
import { SkuRow } from "@/app/san-pham/products-grid";
import type { SkuPage } from "@/lib/sku-catalog";

function pageHref(basePath: string, page: number) {
  return page <= 1 ? basePath : `${basePath}?trang=${page}`;
}

// Server-rendered product list with plain-link pagination, so every page of a
// category is reachable without JavaScript.
export function SkuCatalogList({
  data,
  basePath,
  title,
}: {
  data: SkuPage;
  basePath: string;
  title: string;
}) {
  const { page, totalPages, totalCount, products } = data;
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <section className="category-catalog" id="san-pham" aria-labelledby="category-catalog-title">
      <div className="category-catalog__head">
        <h2 id="category-catalog-title">{title}</h2>
        <p>
          {totalCount.toLocaleString("vi-VN")} sản phẩm
          {totalPages > 1 ? ` · trang ${page}/${totalPages}` : ""} · giá báo theo sản lượng
        </p>
      </div>

      {products.length === 0 ? (
        <div className="sku-empty">Nhóm hàng đang cập nhật. Vui lòng gửi yêu cầu báo giá để được tư vấn.</div>
      ) : (
        <div className="sku-list">
          {products.map((product) => (
            <SkuRow key={product.id} product={product} />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="sku-pagination" aria-label="Phân trang sản phẩm">
          {page > 1 ? (
            <a className="sku-page-btn" href={pageHref(basePath, page - 1)} rel="prev" aria-label="Trang trước">
              <ChevronLeft size={16} />
            </a>
          ) : null}
          {start > 1 ? (
            <>
              <a className="sku-page-btn" href={pageHref(basePath, 1)}>1</a>
              {start > 2 ? <span className="sku-page-ellipsis">...</span> : null}
            </>
          ) : null}
          {pages.map((i) => (
            <a
              key={i}
              className={`sku-page-btn${i === page ? " is-active" : ""}`}
              href={pageHref(basePath, i)}
              aria-current={i === page ? "page" : undefined}
            >
              {i}
            </a>
          ))}
          {end < totalPages ? (
            <>
              {end < totalPages - 1 ? <span className="sku-page-ellipsis">...</span> : null}
              <a className="sku-page-btn" href={pageHref(basePath, totalPages)}>{totalPages}</a>
            </>
          ) : null}
          {page < totalPages ? (
            <a className="sku-page-btn" href={pageHref(basePath, page + 1)} rel="next" aria-label="Trang sau">
              <ChevronRight size={16} />
            </a>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
