import HorizontalDivider from "@/components/horizontal-divider";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router-dom";
import { productState } from "@/state";
import { formatPrice } from "@/utils/format";
import ShareButton from "./share-buttont";
import RelatedProducts from "./related-products";
import { useAddToCart } from "@/hooks";
import { Button } from "zmp-ui";
import Section from "@/components/section";
import QuantityInput from "@/components/quantity-input";
import { useState } from "react";
import toast from "react-hot-toast";
import { validateOrderQuantity, formatQuantityVN } from "@/utils/quantityRules";

export default function ProductDetailPage() {
  const { id } = useParams();
  const product = useAtomValue(productState(id!))!;

  const navigate = useNavigate();
  const { addToCart } = useAddToCart(product);
  const step = product?.orderStep || 1;
  const initialQty = product?.enforceOrderStep && product?.minOrderQty ? product.minOrderQty : step;
  const [quantity, setQuantity] = useState(initialQty);

  const qtyError = product?.enforceOrderStep
    ? validateOrderQuantity(quantity, product.minOrderQty, product.orderStep, true)
    : null;

  const handleAction = (buyNow: boolean) => {
    if (product.enforceOrderStep) {
      const err = validateOrderQuantity(quantity, product.minOrderQty, product.orderStep, true);
      if (err) {
        toast.error(err);
        return;
      }
    }
    addToCart(quantity, buyNow ? undefined : { toast: true });
    if (buyNow) {
      navigate("/cart", { viewTransition: true });
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="w-full p-4 pb-2 space-y-4 bg-section">
          <img
            key={product.id}
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover rounded-lg"
            style={{
              viewTransitionName: `product-image-${product.id}`,
            }}
          />
          <div>
            <div className="text-xl font-bold text-primary">
              {formatPrice(product.price)}
            </div>
            {product.originalPrice && (
              <div className="text-2xs space-x-0.5">
                <span className="text-subtitle line-through">
                  {formatPrice(product.originalPrice)}
                </span>
                <span className="text-danger">
                  -
                  {100 -
                    Math.round((product.price * 100) / product.originalPrice)}
                  %
                </span>
              </div>
            )}
            <div className="text-sm mt-1">{product.name}</div>
            {product.packagingNote && (
              <div className="text-xs text-primary font-medium mt-1">
                📦 Quy cách: {product.packagingNote}
              </div>
            )}
            {product.enforceOrderStep && (
              <div className="text-xs text-subtitle mt-0.5">
                Sản phẩm này đặt theo bước {formatQuantityVN(product.orderStep || 1)} {product.unit || 'Kg'} (tối thiểu {formatQuantityVN(product.minOrderQty || 1)} {product.unit || 'Kg'})
              </div>
            )}
          </div>
          <ShareButton product={product} />
        </div>
        {product.detail && (
          <>
            <div className="bg-background h-2 w-full"></div>
            <Section title="Mô tả sản phẩm">
              <div className="text-sm whitespace-pre-wrap text-subtitle p-4 pt-2">
                {product.detail}
              </div>
            </Section>
          </>
        )}
        <div className="bg-background h-2 w-full"></div>
        <Section title="Sản phẩm khác">
          <RelatedProducts currentProductId={product.id} />
        </Section>
      </div>

      <HorizontalDivider />
      <div className="flex-none p-4 bg-section space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium text-sm">Số lượng ({product.unit || 'Kg'})</span>
            {qtyError && (
              <div className="text-2xs text-danger font-medium mt-0.5">
                ⚠️ {qtyError}
              </div>
            )}
          </div>
          <div className="w-28">
            <QuantityInput
              value={quantity}
              onChange={setQuantity}
              minValue={product.enforceOrderStep && product.minOrderQty ? product.minOrderQty : 0.001}
              step={step}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="tertiary"
            onClick={() => handleAction(false)}
          >
            Thêm vào giỏ
          </Button>
          <Button
            onClick={() => handleAction(true)}
          >
            Mua ngay
          </Button>
        </div>
      </div>
    </div>
  );
}
