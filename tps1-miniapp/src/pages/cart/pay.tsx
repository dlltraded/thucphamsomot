import { useCheckout } from "@/hooks";
import { useAtomValue } from "jotai";
import { cartTotalState, customerAuthState } from "@/state";
import { formatPrice } from "@/utils/format";
import { Button } from "zmp-ui";
import { useState } from "react";

export default function Pay() {
  const { totalAmount, discountPercent, discountedTotal, voucherDiscount } =
    useAtomValue(cartTotalState);
  const customerAuth = useAtomValue(customerAuthState);
  const checkout = useCheckout();
  const [paying, setPaying] = useState(false);

  const displayTotal = customerAuth ? discountedTotal : totalAmount;

  return (
    <div className="flex-none flex items-center py-3 px-4 space-x-2 bg-section">
      <div className="space-y-1 flex-1">
        <div className="text-xs text-subtitle">Tổng tạm tính</div>
        <div className="text-sm font-medium text-primary">
          {formatPrice(displayTotal)}
        </div>
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
        disabled={paying}
      >
        {customerAuth ? "Gửi đơn tạm tính" : "Đăng ký để đặt hàng"}
      </Button>
    </div>
  );
}
