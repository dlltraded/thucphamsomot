import React from "react";
import { Button, Header, Icon, Page, Text } from "zmp-ui";
import { useLocation, useNavigate } from "react-router-dom";

export default function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const orderCode = (useLocation().state as { orderCode?: string } | null)?.orderCode;

  return (
    <Page className="bg-background flex flex-col h-full">
      <Header title="Đã gửi đơn tạm tính" showBackIcon={false} />
      
      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-6">
        <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center">
          <Icon icon="zi-check-circle-solid" className="text-6xl" />
        </div>
        
        <div className="text-center space-y-2">
          <Text size="xLarge" className="font-bold text-primary">
            TPS1 đã nhận được đơn hàng!
          </Text>
          <Text className="text-subtitle">
            Đây là tổng tạm tính. Nhân viên sale sẽ kiểm tra thông tin khách hàng, chốt đơn giá cuối cùng và gửi phiếu xác nhận PDF trước khi thanh toán/giao hàng.
          </Text>
          {orderCode && <div className="mx-auto mt-4 inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary">Mã đơn: {orderCode}</div>}
        </div>

        <div className="pt-8 w-full px-4">
          <Button
            fullWidth
            onClick={() => navigate("/orders/pending", { viewTransition: true, replace: true })}
          >
            Theo dõi đơn hàng
          </Button>
          <Button className="mt-2" fullWidth variant="tertiary" onClick={() => navigate("/", { viewTransition: true, replace: true })}>Tiếp tục mua hàng</Button>
        </div>
      </div>
    </Page>
  );
}
