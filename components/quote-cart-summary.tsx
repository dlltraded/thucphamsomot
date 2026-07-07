"use client";

import Link from "next/link";
import { ShoppingBag, X, Minus, Plus, ArrowRight, PackageCheck } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import type { Locale } from "@/lib/site";

// Inline styles để đảm bảo render đúng bất kể CSS cache/Turbopack
const S = {
  empty: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    padding: "16px 18px",
    border: "1.5px dashed rgba(20,35,28,0.15)",
    borderRadius: 10,
    background: "rgba(15,111,75,0.03)",
    marginBottom: 18,
  } as React.CSSProperties,
  emptyText: { flex: 1 } as React.CSSProperties,
  emptyTitle: { margin: "0 0 4px", fontSize: 14, fontWeight: 700 } as React.CSSProperties,
  emptySub: { margin: 0, fontSize: 13, color: "#59665f", lineHeight: 1.6 } as React.CSSProperties,
  box: {
    border: "1.5px solid rgba(15,111,75,0.22)",
    borderRadius: 10,
    background: "rgba(15,111,75,0.04)",
    marginBottom: 20,
    overflow: "hidden",
  } as React.CSSProperties,
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "11px 15px",
    borderBottom: "1px solid rgba(15,111,75,0.14)",
    background: "rgba(15,111,75,0.07)",
  } as React.CSSProperties,
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    fontWeight: 800,
    color: "#0f6f4b",
  } as React.CSSProperties,
  countBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 20,
    height: 20,
    padding: "0 5px",
    borderRadius: 999,
    background: "#0f6f4b",
    color: "#fff",
    fontSize: 11,
    fontWeight: 900,
  } as React.CSSProperties,
  editLink: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    fontWeight: 700,
    color: "#0f6f4b",
    textDecoration: "none",
  } as React.CSSProperties,
  list: {
    listStyle: "none",
    margin: 0,
    padding: "6px 0",
    maxHeight: 260,
    overflowY: "auto",
  } as React.CSSProperties,
  item: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "7px 15px",
  } as React.CSSProperties,
  itemInfo: { flex: "1 1 auto", minWidth: 0 } as React.CSSProperties,
  itemName: {
    display: "block",
    fontSize: 13,
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  itemUnit: {
    display: "block",
    fontSize: 11,
    color: "#59665f",
    marginTop: 1,
  } as React.CSSProperties,
  controls: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  } as React.CSSProperties,
  qty: {
    display: "flex",
    alignItems: "center",
    border: "1px solid rgba(20,35,28,0.12)",
    borderRadius: 6,
    overflow: "hidden",
    background: "#fff",
  } as React.CSSProperties,
  qtyBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    border: 0,
    background: "transparent",
    cursor: "pointer",
    color: "#14231c",
  } as React.CSSProperties,
  qtyNum: {
    minWidth: 24,
    textAlign: "center",
    fontSize: 12,
    fontWeight: 700,
  } as React.CSSProperties,
  removeBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    border: "1px solid transparent",
    borderRadius: 4,
    background: "transparent",
    color: "#59665f",
    cursor: "pointer",
  } as React.CSSProperties,
  note: {
    margin: 0,
    padding: "9px 15px",
    borderTop: "1px solid rgba(15,111,75,0.14)",
    fontSize: 11.5,
    color: "#59665f",
    lineHeight: 1.6,
    background: "rgba(255,255,255,0.5)",
  } as React.CSSProperties,
};

const UI = {
  vi: {
    emptyTitle: "Giỏ báo giá đang trống",
    emptySub1: "Anh/chị có thể điền form bên dưới, hoặc ",
    emptySubLink: "chọn hàng từ danh mục",
    emptySub2: " trước để gửi RFQ chính xác hơn.",
    selectedProducts: "Giỏ báo giá",
    addProducts: "Đưa thêm hàng",
    unit: "ĐV: ",
    decrease: "Giảm",
    increase: "Tăng",
    remove: "Xóa",
    note: "Các mặt hàng đã chọn sẽ được gắn tự động vào yêu cầu báo giá. Giá sẽ được báo riêng theo khối lượng thực tế.",
    productsLink: "/san-pham"
  },
  en: {
    emptyTitle: "RFQ basket is empty",
    emptySub1: "You can fill the form below, or ",
    emptySubLink: "pick items from the catalog",
    emptySub2: " first for a more accurate RFQ.",
    selectedProducts: "RFQ basket",
    addProducts: "Add more items",
    unit: "Unit: ",
    decrease: "Decrease",
    increase: "Increase",
    remove: "Remove",
    note: "Selected items are automatically attached to this request. Pricing is provided after submission.",
    productsLink: "/en/products"
  }
};

export function QuoteCartSummary({ locale = "vi" }: { locale?: Locale }) {
  const { items, count, removeItem, updateQty } = useCart();
  const text = UI[locale];

  if (items.length === 0) {
    return (
      <div style={S.empty}>
        <ShoppingBag size={26} strokeWidth={1.4} color="#59665f" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={S.emptyText}>
          <p style={S.emptyTitle}>{text.emptyTitle}</p>
          <p style={S.emptySub}>
            {text.emptySub1}
            <Link href={text.productsLink} style={{ color: "#0f6f4b", fontWeight: 700, textDecoration: "underline" }}>
              {text.emptySubLink}
            </Link>
            {text.emptySub2}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={S.box}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <PackageCheck size={17} />
          <span>{text.selectedProducts}</span>
          <span style={S.countBadge}>{count}</span>
        </div>
        <Link href={text.productsLink} style={S.editLink}>
          <ArrowRight size={14} />
          {text.addProducts}
        </Link>
      </div>

      {/* Item list */}
      <ul style={S.list}>
        {items.map((item) => (
          <li key={item.slug} style={S.item}>
            <div style={S.itemInfo}>
              <span style={S.itemName}>{item.title}</span>
              {item.summary && (
                <span style={S.itemUnit}>{text.unit}{item.summary}</span>
              )}
            </div>
            <div style={S.controls}>
              <div style={S.qty}>
                <button
                  type="button"
                  style={S.qtyBtn}
                  aria-label={text.decrease}
                  onClick={() => updateQty(item.slug, item.quantity - 1)}
                >
                  <Minus size={12} />
                </button>
                <span style={S.qtyNum}>{item.quantity}</span>
                <button
                  type="button"
                  style={S.qtyBtn}
                  aria-label={text.increase}
                  onClick={() => updateQty(item.slug, item.quantity + 1)}
                >
                  <Plus size={12} />
                </button>
              </div>
              <button
                type="button"
                style={S.removeBtn}
                aria-label={`${text.remove} ${item.title}`}
                onClick={() => removeItem(item.slug)}
              >
                <X size={13} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <p style={S.note}>
        {text.note}
      </p>
    </div>
  );
}
