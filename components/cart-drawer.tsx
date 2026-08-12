"use client";

import Link from "next/link";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import type { Locale } from "@/lib/site";
import { useCustomerSession } from "@/lib/customer-session-context";

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
  locale?: Locale;
};

const UI = {
  vi: {
    contact: "Nhận báo giá",
    title: "Giỏ báo giá",
    clearAll: "Xóa tất cả",
    close: "Đóng giỏ báo giá",
    empty: "Giỏ báo giá đang trống",
    emptySub: "Chọn mặt hàng từ danh mục để tạo RFQ nhanh hơn",
    viewProducts: "Chọn hàng",
    decrease: "Giảm",
    increase: "Tăng",
    remove: "Xóa",
    items: "mặt hàng",
    note: "Mặt hàng đã chọn sẽ đi kèm trong yêu cầu báo giá.",
    submit: "Mở form báo giá",
    productsLink: "/san-pham",
    quoteLink: "/bao-gia"
  },
  en: {
    contact: "Request quote",
    title: "RFQ Basket",
    clearAll: "Clear all",
    close: "Close RFQ basket",
    empty: "RFQ basket is empty",
    emptySub: "Pick items from the catalog to build a faster RFQ",
    viewProducts: "Pick items",
    decrease: "Decrease",
    increase: "Increase",
    remove: "Remove",
    items: "items",
    note: "Selected items will be included in the quote request.",
    submit: "Open quote form",
    productsLink: "/en/products",
    quoteLink: "/en/bao-gia"
  }
};

const fmt = (n: number, textContact: string) =>
  n > 0
    ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n)
    : textContact;

export function CartDrawer({ open, onClose, locale = "vi" }: CartDrawerProps) {
  const { items, count, removeItem, updateQty, clear } = useCart();
  const { session } = useCustomerSession();
  const baseText = UI[locale];
  const text = session
    ? {
        ...baseText,
        contact: "Liên hệ",
        title: "Giỏ hàng đặt hàng",
        close: "Đóng giỏ hàng",
        empty: "Giỏ hàng đang trống",
        emptySub: "Chọn sản phẩm để tạo đơn hàng theo giá VIP của tài khoản.",
        note: "Giá và chiết khấu sẽ được máy chủ xác nhận khi đặt hàng.",
        submit: "Kiểm tra và đặt hàng",
        quoteLink: "/portal/gio-hang",
      }
    : baseText;

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="cart-overlay"
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={`cart-drawer${open ? " is-open" : ""}`}
        aria-label={text.title}
        role="dialog"
        aria-modal="true"
        id="cart-drawer"
      >
        {/* Header */}
        <div className="cart-drawer__header">
          <div className="cart-drawer__title">
            <ShoppingBag size={20} />
            <span>{text.title}</span>
            {count > 0 && (
              <span className="cart-drawer__count">{count}</span>
            )}
          </div>
          <div className="cart-drawer__header-actions">
            {items.length > 0 && (
              <button
                type="button"
                className="cart-clear-btn"
                onClick={clear}
                title={text.clearAll}
              >
                <Trash2 size={15} />
                {text.clearAll}
              </button>
            )}
            <button
              type="button"
              className="cart-close-btn"
              onClick={onClose}
              aria-label={text.close}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="cart-drawer__body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <ShoppingBag size={48} strokeWidth={1.2} />
              <p>{text.empty}</p>
              <p className="cart-empty__sub">{text.emptySub}</p>
              <Link href={text.productsLink} className="btn-secondary" onClick={onClose}>
                {text.viewProducts}
              </Link>
            </div>
          ) : (
            <ul className="cart-list">
              {items.map((item) => (
                <li key={item.slug} className="cart-item">
                  <div className="cart-item__info">
                    <span className="cart-item__name">{item.title}</span>
                    {item.summary && (
                      <span className="cart-item__unit">{item.summary}</span>
                    )}
                  </div>
                  <div className="cart-item__controls">
                    <div className="cart-qty">
                      <button
                        type="button"
                        aria-label={text.decrease}
                        onClick={() => updateQty(item.slug, item.quantity - 1)}
                      >
                        <Minus size={13} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={text.increase}
                        onClick={() => updateQty(item.slug, item.quantity + 1)}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="cart-item__remove"
                      aria-label={text.remove}
                      onClick={() => removeItem(item.slug)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      {/* Footer */}
        {items.length > 0 && (
          <div className="cart-drawer__footer">
            <p className="cart-footer__note">
              {count} {text.items} · {text.note}
            </p>
            <div className="flex flex-col gap-2 w-full mt-2">
              <Link
                href={text.quoteLink}
                className="btn-primary cart-footer__cta"
                onClick={onClose}
              >
                <ShoppingBag size={16} />
                {text.submit}
                </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
