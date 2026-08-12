import React from "react";
import { Button, Header, Icon, Page, Text } from "zmp-ui";
import { useLocation, useNavigate } from "react-router-dom";

export default function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const orderCode = (useLocation().state as { orderCode?: string } | null)?.orderCode;

  return (
    <Page className="bg-background flex flex-col h-full">
      <Header title="Đặt hàng thành công" showBackIcon={false} />
      
      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-6">
        <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center">
          <Icon icon="zi-check-circle-solid" className="text-6xl" />
        </div>
        
        <div className="text-center space-y-2">
          <Text size="xLarge" className="font-bold text-primary">
            Cảm ơn bạn đã đặt hàng!
          </Text>
          <Text className="text-subtitle">
            Yêu cầu đặt hàng của bạn đã được gửi thành công. Nhân viên của chúng tôi sẽ sớm liên hệ để xác nhận đơn hàng và thời gian giao hàng.
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
