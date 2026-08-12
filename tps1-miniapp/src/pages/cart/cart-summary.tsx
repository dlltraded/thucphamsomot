import { useAtomValue } from "jotai";
import { cartTotalState, customerAuthState } from "@/state";
import { formatPrice } from "@/utils/format";
import Section from "@/components/section";
import HorizontalDivider from "@/components/horizontal-divider";

export default function CartSummary() {
  const { totalAmount, discountPercent, discountedTotal } =
    useAtomValue(cartTotalState);
  const customerAuth = useAtomValue(customerAuthState);
  const hasDiscount = !!customerAuth && discountPercent > 0;

  return (
    <Section title="Thanh toán" className="rounded-lg">
      <div className="px-4 py-2 space-y-4">
        <table className="table w-full text-sm [&_th]:text-left [&_th]:text-xs [&_th]:text-inactive [&_th]:font-medium [&_td]:text-right">
          <tbody>
            <tr>
              <th>Tạm tính</th>
              <td>{formatPrice(totalAmount)}</td>
            </tr>
            {hasDiscount && (
              <tr>
                <th>
                  Chiết khấu {customerAuth!.tier} (-{discountPercent}%)
                </th>
                <td className="text-primary">
                  -{formatPrice(totalAmount - discountedTotal)}
                </td>
              </tr>
            )}
            <tr>
              <th>Phí vận chuyển</th>
              <td>0 VND</td>
            </tr>
          </tbody>
        </table>
        <HorizontalDivider />
        <div className="flex justify-between font-medium text-sm">
          <div>Tổng thanh toán</div>
          <div>{formatPrice(hasDiscount ? discountedTotal : totalAmount)}</div>
        </div>
      </div>
    </Section>
  );
}
