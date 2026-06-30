"use client";

import Link from "next/link";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import type { Locale } from "@/lib/site";

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
  locale?: Locale;
};

const UI = {
  vi: {
    contact: "Liên hệ báo giá",
    title: "Giỏ hàng",
    clearAll: "Xóa tất cả",
    close: "Đóng giỏ hàng",
    empty: "Giỏ hàng trống",
    emptySub: "Thêm sản phẩm từ trang Sản Phẩm",
    viewProducts: "Xem sản phẩm",
    decrease: "Giảm",
    increase: "Tăng",
    remove: "Xóa",
    items: "sản phẩm",
    note: "Giá sẽ được tư vấn cụ thể",
    submit: "Gửi yêu cầu báo giá",
    productsLink: "/san-pham",
    quoteLink: "/bao-gia"
  },
  en: {
    contact: "Contact for quote",
    title: "Quote Cart",
    clearAll: "Clear all",
    close: "Close cart",
    empty: "Cart is empty",
    emptySub: "Add products from the Products page",
    viewProducts: "View products",
    decrease: "Decrease",
    increase: "Increase",
    remove: "Remove",
    items: "items",
    note: "Prices will be quoted directly",
    submit: "Request quote",
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
  const text = UI[locale];

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
              <button
                type="button"
                className="btn-secondary cart-footer__cta"
                onClick={async () => {
                  try {
                    const { Payment } = await import("zmp-sdk");
                    const totalAmount = items.reduce((acc, item) => acc + 10000 * item.quantity, 0);
                    // Generate MAC from backend
                    const response = await fetch('/api/payment/create-order-mac', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        amount: totalAmount > 0 ? totalAmount : 10000, // Zalo requires amount > 0
                        desc: "Thanh toán đơn hàng Thực Phẩm Số Một",
                        method: JSON.stringify({ id: "COD", isCustom: false }), // Optional but good for strict matching
                        item: JSON.stringify(items.map(it => ({ id: it.slug, amount: 10000 })))
                      })
                    });
                    const { mac } = await response.json();
                    
                    Payment.createOrder({
                      amount: totalAmount > 0 ? totalAmount : 10000,
                      desc: "Thanh toán đơn hàng Thực Phẩm Số Một",
                      item: items.map(it => ({ id: it.slug, amount: 10000 })),
                      method: { id: "COD", isCustom: false },
                      mac: mac,
                      success: (data) => {
                        console.log("Thanh toán thành công", data);
                        clear();
                        onClose();
                      },
                      fail: (err) => {
                        console.log("Lỗi tạo order", err);
                      }
                    });
                  } catch (error) {
                    console.error("Lỗi khi gọi thanh toán:", error);
                  }
                }}
              >
                Thanh toán trực tiếp (COD)
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
