import React from "react";
import { Box, Button, Header, Icon, Page, Text } from "zmp-ui";
import { openChat } from "zmp-sdk/apis";
import { getConfig } from "@/utils/template";
import logoUrl from "@/static/logo.png";
import { useCustomerSupport } from "@/hooks";

export default function ShopInfoPage() {
  const shopName = getConfig((c) => c.template.shopName) || "Thực Phẩm Biển Ngọc";
  const shopAddress = getConfig((c) => c.template.shopAddress) || "25 Đường số 2, Khu Phố 1, Thủ Đức, Hồ Chí Minh";
  const support = useCustomerSupport();

  return (
    <Page className="bg-background flex flex-col h-full">
      <Header title="Thông tin cửa hàng" showBackIcon />
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f4f5f6]">
        {/* Title Card */}
        <div className="bg-white rounded-xl p-4 flex items-center space-x-4 shadow-sm">
          <img 
            src={getConfig((c) => c.template.logoUrl) || logoUrl} 
            alt="Logo" 
            className="w-12 h-12 rounded-full border border-gray-100 object-contain p-1"
          />
          <Text size="large" className="font-semibold text-gray-800">{shopName}</Text>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-xl p-4 space-y-4 shadow-sm">
          {/* Address */}
          <div className="flex items-start space-x-3 pb-4 border-b border-gray-100">
            <div className="text-gray-500 mt-0.5">
              <Icon icon="zi-location" />
            </div>
            <div className="flex-1">
              <Text className="text-gray-500 text-sm mb-1">Địa chỉ</Text>
              <Text className="text-gray-800 text-sm">{shopAddress}</Text>
            </div>
          </div>

          {/* Description */}
          <div className="flex items-start space-x-3 pb-4 border-b border-gray-100">
            <div className="text-gray-500 mt-0.5">
              <Icon icon="zi-note" />
            </div>
            <div className="flex-1">
              <Text className="text-gray-500 text-sm mb-1">Mô tả shop</Text>
              <Text className="text-gray-800 text-sm leading-relaxed">
                Cửa hàng Kho Thực Phẩm Đông Lạnh Biển Ngọc chuyên kinh doanh các mặt hàng về Thực phẩm nhập khẩu đông lạnh Thịt bò - Hải sản - Sashimi - Thịt Heo ..v..v..
              </Text>
            </div>
          </div>

          {/* Link */}
          <div className="flex items-start space-x-3">
            <div className="text-gray-500 mt-0.5">
              <Icon icon="zi-link" />
            </div>
            <div className="flex-1">
              <Text className="text-gray-500 text-sm mb-1">Link của shop</Text>
              <div className="flex items-center justify-between space-x-2">
                <Text className="text-gray-800 text-sm break-all flex-1">
                  https://zalo.me/s/2491409827321022280
                </Text>
                <button 
                  className="w-8 h-8 rounded-full bg-blue-50 text-primary flex items-center justify-center flex-shrink-0"
                  onClick={() => {
                    // Mở link hoặc copy
                  }}
                >
                  <Icon icon="zi-share-external-1" size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <Button
          fullWidth
          onClick={support}
          className="rounded-lg"
        >
          Liên hệ cửa hàng
        </Button>
      </div>
    </Page>
  );
}
