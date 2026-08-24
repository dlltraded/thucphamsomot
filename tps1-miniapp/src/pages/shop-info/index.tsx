import React from "react";
import { Box, Button, Header, Icon, Page, Text } from "zmp-ui";
import { openChat } from "zmp-sdk/apis";
import { getConfig } from "@/utils/template";
import logoUrl from "@/static/logo.png";
import { useCustomerSupport } from "@/hooks";
import toast from "react-hot-toast";

export default function ShopInfoPage() {
  const shopName = getConfig((c) => c.template.shopName) || "Thực Phẩm Số Một";
  const shopAddress =
    getConfig((c) => c.template.shopAddress) || "B19 KP15, Tam Hiệp, Biên Hòa, Đồng Nai";
  const shopLink = `https://zalo.me/s/${getConfig((c) => c.app.appId)}/`;
  const support = useCustomerSupport();

  const handleCopyLink = () => {
    navigator.clipboard
      ?.writeText(shopLink)
      .then(() => toast.success("Đã sao chép link cửa hàng"))
      .catch(() => toast.error("Không sao chép được, vui lòng thử lại"));
  };

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
                Công ty TNHH Thực Phẩm Số Một (TPS1) — thành lập từ năm 2017,
                chuyên cung cấp thực phẩm sỉ (B2B) với hơn 5000+ sản phẩm: rau
                củ quả, hải sản, thịt & đông lạnh, gia vị, đồ khô, bánh trứng
                sữa... Phục vụ 100+ khách hàng là bếp ăn tập thể, nhà máy/KCN,
                trường học, bệnh viện, nhà hàng, khách sạn tại Đồng Nai và khu
                vực lân cận.
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
                  {shopLink}
                </Text>
                <button
                  className="w-8 h-8 rounded-full bg-blue-50 text-primary flex items-center justify-center flex-shrink-0"
                  onClick={handleCopyLink}
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
