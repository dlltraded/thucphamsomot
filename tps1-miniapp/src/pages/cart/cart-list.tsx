import { useAtomValue } from "jotai";
import { cartState } from "@/state";
import CartItem from "./cart-item";
import Section from "@/components/section";
import { Icon, Input } from "zmp-ui";
import HorizontalDivider from "@/components/horizontal-divider";

export default function CartList() {
  const cart = useAtomValue(cartState);

  return (
    <Section
      title={
        <div className="flex items-center space-x-2">
          <Icon icon="zi-inbox" />
          <span className="font-semibold text-sm">Danh sách sản phẩm ({cart.length})</span>
        </div>
      }
      className="flex-1 overflow-y-auto rounded-lg"
    >
      <div className="w-full">
        {cart.map((item) => (
          <CartItem key={item.product.id} {...item} />
        ))}
      </div>
    </Section>
  );
}
