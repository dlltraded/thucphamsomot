"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { usePathname } from "next/navigation";

export function FloatingCart() {
  const { count } = useCart();
  const pathname = usePathname();

  // Don't show the floating cart on the quote page itself
  if (pathname === "/bao-gia" || count === 0) {
    return null;
  }

  return (
    <Link href="/bao-gia" className="floating-cart" aria-label="Xem giỏ báo giá">
      <div className="floating-cart__icon">
        <ShoppingCart size={24} />
        <span className="floating-cart__badge">{count}</span>
      </div>
    </Link>
  );
}
