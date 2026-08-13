import CartList from "./cart-list";
import ApplyVoucher from "./apply-voucher";
import CartSummary from "./cart-summary";
import { useAtomValue } from "jotai";
import { cartState, customerAuthState } from "@/state";
import { EmptyCart } from "@/components/empty";
import Delivery from "./delivery";
import HorizontalDivider from "@/components/horizontal-divider";
import Pay from "./pay";
import PaymentMethod from "./payment-method";
import TransitionLink from "@/components/transition-link";
import { Icon } from "zmp-ui";

export default function CartPage() {
  const cart = useAtomValue(cartState);
  const customerAuth = useAtomValue(customerAuthState);

  if (!cart.length) {
    return <EmptyCart />;
  }
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {!customerAuth && (
          <TransitionLink
            to="/register?redirect=/cart"
            className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs rounded-lg px-3 py-2"
          >
            <Icon icon="zi-user" size={16} />
            <span className="flex-1">
              Đăng ký tài khoản để gửi đơn. TPS1 sẽ kiểm tra và xác nhận đơn giá cuối cùng.
            </span>
            <Icon icon="zi-chevron-right" size={16} />
          </TransitionLink>
        )}
        <Delivery />
        <CartList />
        <PaymentMethod />
        <CartSummary />
      </div>
      <HorizontalDivider />
      <Pay />
    </div>
  );
}
