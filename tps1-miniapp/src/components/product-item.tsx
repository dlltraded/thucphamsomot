import { Product } from "@/types";
import { formatPrice } from "@/utils/format";
import TransitionLink from "./transition-link";
import { useAddToCart } from "@/hooks";
import { Button } from "zmp-ui";
import { useState } from "react";
import QuantityInput from "./quantity-input";

import logoUrl from "@/static/logo.png";

export interface ProductItemProps {
  product: Product;
  replace?: boolean;
}

export default function ProductItem(props: ProductItemProps) {
  const { addToCart, cartQuantity } = useAddToCart(props.product);
  const [qty, setQty] = useState(1);

  return (
    <div className="bg-background rounded-xl p-3 shadow-[0_10px_24px_#0D0D0D17] flex flex-col gap-2">
      <TransitionLink
        to={`/product/${props.product.id}`}
        replace={props.replace}
        className="flex gap-4"
      >
        <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-section flex-shrink-0 flex items-center justify-center">
          <img
            className="w-full h-full object-cover"
            src={props.product.image || "https://zalo-miniapp.github.io/zaui-market/dummy/product/image.jpg"}
            onError={(e) => {
              (e.target as HTMLImageElement).src = logoUrl;
              (e.target as HTMLImageElement).className = "w-1/2 h-1/2 object-contain opacity-20";
            }}
          />
          {cartQuantity > 0 && (
            <div className="absolute top-1 right-1 bg-primary text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-background">
              {cartQuantity}
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col">
          <div className="text-sm font-medium line-clamp-2">
            {props.product.name}
          </div>
          <div className="mt-1 text-sm font-bold text-primary flex items-baseline gap-2">
            {formatPrice(props.product.price)}
          </div>
          {props.product.originalPrice && props.product.originalPrice > props.product.price && (
            <span className="text-xs text-subtitle line-through font-normal block">
              {formatPrice(props.product.originalPrice)}
            </span>
          )}
        </div>
      </TransitionLink>
      
      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 max-w-[120px]">
          <QuantityInput value={qty} onChange={setQty} minValue={1} />
        </div>
        <Button 
          size="small"
          className="flex-1"
          onClick={() => {
            addToCart((old) => old + qty, { toast: true });
            setQty(1);
          }}
        >
          Thêm
        </Button>
      </div>
    </div>
  );
}
