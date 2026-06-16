"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import type { Locale } from "@/lib/site";

type CartBadgeProps = {
  onClick: () => void;
  locale?: Locale;
};

export function CartBadge({ onClick, locale = "vi" }: CartBadgeProps) {
  const { count } = useCart();
  
  const ariaLabel = locale === "en"
    ? `Cart${count > 0 ? ` (${count} items)` : ""}`
    : `Giỏ hàng${count > 0 ? ` (${count} sản phẩm)` : ""}`;

  return (
    <button
      type="button"
      className="cart-badge-btn"
      aria-label={ariaLabel}
      onClick={onClick}
      id="cart-badge-btn"
    >
      <ShoppingCart size={20} />
      {count > 0 && (
        <span className="cart-badge-count" aria-hidden="true">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
