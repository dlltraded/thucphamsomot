import { useState } from "react";
import Section from "@/components/section";
import { VoucherIcon } from "@/components/vectors";
import { Icon, Input, Button } from "zmp-ui";
import { useAtom, useAtomValue } from "jotai";
import { activeVoucherState, cartTotalState, customerAuthState } from "@/state";
import CONFIG from "@/config";

export default function ApplyVoucher() {
  const customerAuth = useAtomValue(customerAuthState);
  const [activeVoucher, setActiveVoucher] = useAtom(activeVoucherState);
  const { totalAmount } = useAtomValue(cartTotalState);
  
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const applyVoucher = async () => {
    if (!code.trim()) {
      setError("Vui lòng nhập mã");
      return;
    }
    if (!customerAuth) {
      setError("Bạn cần đăng nhập để dùng mã");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const apiUrl = CONFIG.API_BASE;
      const res = await fetch(`${apiUrl}/api/customer/voucher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucherCode: code,
          orderSessionToken: customerAuth.orderSessionToken,
          totalAmount: totalAmount,
        }),
      });
      
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Mã không hợp lệ");
      }
      
      setActiveVoucher(data.voucher);
      setCode(""); // clear input on success
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeVoucher = () => {
    setActiveVoucher(null);
    setError("");
  };

  return (
    <Section title="Khuyến mãi" className="rounded-lg">
      <div className="py-2 px-4">
        {activeVoucher ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex flex-col">
              <span className="font-semibold text-green-700 uppercase">{activeVoucher.code}</span>
              <span className="text-xs text-green-600">
                Đã áp dụng giảm {activeVoucher.discount_amount > 0 ? `${activeVoucher.discount_amount.toLocaleString()}đ` : `${activeVoucher.discount_percent}%`}
              </span>
            </div>
            <button onClick={removeVoucher} className="text-red-500 p-1">
              <Icon icon="zi-close-circle" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col space-y-2">
            <div className="flex space-x-2">
              <div className="flex-1">
                <Input 
                  placeholder="Nhập mã voucher" 
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setError(""); }}
                  clearable
                  disabled={!customerAuth}
                />
              </div>
              <Button 
                onClick={applyVoucher} 
                loading={loading}
                disabled={!code.trim() || !customerAuth}
                className="whitespace-nowrap"
              >
                Áp dụng
              </Button>
            </div>
            {error && <div className="text-xs text-red-500 pl-1">{error}</div>}
            {!customerAuth && <div className="text-xs text-yellow-600 pl-1">Yêu cầu đăng nhập để sử dụng voucher</div>}
          </div>
        )}
      </div>
    </Section>
  );
}
