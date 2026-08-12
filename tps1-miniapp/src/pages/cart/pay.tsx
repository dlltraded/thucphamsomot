import { useCheckout } from "@/hooks";
import { useAtomValue } from "jotai";
import { cartTotalState, customerAuthState } from "@/state";
import { formatPrice } from "@/utils/format";
import { Button } from "zmp-ui";
import { useState } from "react";

export default function Pay() {
  const { totalAmount, discountPercent, discountedTotal } =
    useAtomValue(cartTotalState);
  const customerAuth = useAtomValue(customerAuthState);
  const checkout = useCheckout();
  const [paying, setPaying] = useState(false);

  const displayTotal = customerAuth ? discountedTotal : totalAmount;

  return (
    <div className="flex-none flex items-center py-3 px-4 space-x-2 bg-section">
      <div className="space-y-1 flex-1">
        <div className="text-xs text-subtitle">Tổng thanh toán</div>
        <div className="text-sm font-medium text-primary">
          {formatPrice(displayTotal)}
        </div>
        {customerAuth && discountPercent > 0 && (
          <div className="text-2xs text-subtitle">
            Đã áp chiết khấu {customerAuth.tier} -{discountPercent}%
          </div>
        )}
      </div>
      <Button
        onClick={async () => {
          setPaying(true);
          await checkout();
          setPaying(false);
        }}
        disabled={paying}
      >
        {customerAuth ? "Đặt hàng" : "Đăng nhập để đặt hàng"}
      </Button>
    </div>
  );
}
