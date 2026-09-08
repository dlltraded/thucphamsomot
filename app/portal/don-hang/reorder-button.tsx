"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import type { QuoteBasketItem } from "@/lib/quote-basket";

interface OrderItem {
  id?: string;
  name?: string;
  sku?: string;
  unit?: string;
  quantity?: number;
  qty?: number;
  price?: number;
  unitPrice?: number;
  lineTotal?: number;
}

interface ReorderButtonProps {
  items: OrderItem[];
  orderId: string;
}

/**
 * "Đặt lại đơn" button for the web portal's order history page.
 *
 * Maps order items → QuoteBasketItems (keyed by SKU or name-slug),
 * replaces the current cart, then redirects to /portal/gio-hang.
 */
export function ReorderButton({ items, orderId }: ReorderButtonProps) {
  const { replaceCart } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleReorder = () => {
    setLoading(true);
    try {
      const cartItems: QuoteBasketItem[] = items
        .filter((item) => item.name)
        .map((item) => {
          const qty = Number(item.quantity ?? item.qty ?? 1);
          const unitPrice = Number(
            item.price ?? item.unitPrice ??
            (item.lineTotal && qty ? item.lineTotal / qty : 0)
          );
          // Use SKU as slug key; fall back to a sanitised name slug
          const slug =
            item.sku ||
            (item.name || "")
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9\-]/g, "");
          return {
            slug,
            title: item.name || "Sản phẩm",
            summary: item.unit ? `Đơn vị: ${item.unit}` : undefined,
            quantity: Math.max(qty, 1),
            price: unitPrice || undefined,
          };
        });

      if (cartItems.length === 0) {
        alert("Không có sản phẩm hợp lệ trong đơn hàng này.");
        return;
      }

      replaceCart(cartItems);
      router.push("/portal/gio-hang");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleReorder}
      disabled={loading}
      className="customer-reorder-btn"
      title={`Đặt lại đơn hàng ${orderId}`}
    >
      <RotateCcw size={14} />
      {loading ? "Đang xử lý…" : "Đặt lại đơn này"}
    </button>
  );
}
