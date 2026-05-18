"use client";

import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { addQuoteItem } from "@/lib/quote-basket";

type QuoteAddButtonProps = {
  product: {
    slug: string;
    title: string;
    summary?: string;
  };
  className?: string;
  label?: string;
};

export function QuoteAddButton({ product, className = "btn-secondary", label = "Thêm vào báo giá" }: QuoteAddButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        addQuoteItem(product);
        router.push("/bao-gia");
      }}
    >
      <ShoppingBag size={16} />
      {label}
    </button>
  );
}
