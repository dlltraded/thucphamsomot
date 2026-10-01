import { useAtomValue } from "jotai";
import { cartTotalState } from "@/state";
import { formatPrice } from "@/utils/format";
import Section from "@/components/section";
import HorizontalDivider from "@/components/horizontal-divider";

export default function CartSummary() {
  const { totalAmount, discountedTotal } =
    useAtomValue(cartTotalState);

  return (
    <Section title="Tạm tính đơn hàng" className="rounded-lg">
      <div className="px-4 py-2 space-y-4">
        <table className="table w-full text-sm [&_th]:text-left [&_th]:text-xs [&_th]:text-inactive [&_th]:font-medium [&_td]:text-right">
          <tbody>
            <tr>
              <th>Tạm tính</th>
              <td>{formatPrice(totalAmount)}</td>
            </tr>
            <tr>
              <th>Phí vận chuyển</th>
              <td>0 VND</td>
            </tr>
          </tbody>
        </table>
        <HorizontalDivider />
        <div className="flex justify-between font-medium text-sm">
          <div>Tổng tạm tính</div>
          <div>{formatPrice(discountedTotal)}</div>
        </div>
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-2xs leading-4 text-amber-800">
          Đơn giá cuối cùng sẽ được nhân viên TPS1 kiểm tra và xác nhận trước khi thanh toán/giao hàng.
        </p>
      </div>
    </Section>
  );
}
