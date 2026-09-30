import { useCheckout } from "@/hooks";
import { useAtomValue } from "jotai";
import { cartTotalState, customerAuthState, cartState } from "@/state";
import { formatPrice } from "@/utils/format";
import { Button } from "zmp-ui";
import { useState } from "react";
import { validateOrderQuantity } from "@/utils/quantityRules";

export default function Pay() {
  const { totalAmount, discountPercent, discountedTotal, voucherDiscount } =
    useAtomValue(cartTotalState);
  const customerAuth = useAtomValue(customerAuthState);
  const cart = useAtomValue(cartState);
  const checkout = useCheckout();
  const [paying, setPaying] = useState(false);

  const displayTotal = customerAuth ? discountedTotal : totalAmount;

  const hasInvalidCart = cart.some(
    (item) =>
      item.product.enforceOrderStep &&
      validateOrderQuantity(item.quantity, item.product.minOrderQty, item.product.orderStep, true) !== null
  );

  return (
    <div className="flex-none flex items-center py-3 px-4 space-x-2 bg-section">
      <div className="space-y-1 flex-1">
        <div className="text-xs text-subtitle">Tổng tạm tính</div>
        <div className="text-sm font-medium text-primary">
          {formatPrice(displayTotal)}
        </div>
        {hasInvalidCart && (
          <div className="text-3xs text-danger font-medium">
            Có món chưa đúng quy cách đặt
          </div>
        )}
        {customerAuth && discountPercent > 0 && (
          <div className="text-2xs text-subtitle">
            Giá đề xuất theo {customerAuth.tier} -{discountPercent}%
          </div>
        )}
        {voucherDiscount > 0 && (
          <div className="text-2xs text-green-600 font-medium">
            Voucher: -{formatPrice(voucherDiscount)}
          </div>
        )}
      </div>
      <Button
        onClick={async () => {
          setPaying(true);
          await checkout();
          setPaying(false);
        }}
        disabled={paying || hasInvalidCart}
      >
        {customerAuth ? "Gửi đơn tạm tính" : "Đăng ký để đặt hàng"}
      </Button>
    </div>
  );
}
