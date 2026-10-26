import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Long Thành cho bếp ăn, nhà hàng",
  description:
    "TPS1 giao thực phẩm theo lịch cho bếp ăn nhà máy tại KCN Lộc An, Bình Sơn, An Phước cùng nhà hàng, quán ăn ở Long Thành. Đạt ISO 22000, HACCP; báo giá 24 giờ.",
  path: "/cung-cap-thuc-pham-long-thanh",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Long Thành",
});

export default function LongThanhLandingPage() {
  return <LocalLandingPage config={localLandingPages.longThanh} />;
}
