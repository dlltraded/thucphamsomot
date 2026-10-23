import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Long Thành cho bếp ăn nhà máy",
  description: "TPS1 cung cấp thực phẩm giá sỉ cho bếp ăn nhà máy, xí nghiệp khu vực Long Thành: giao theo lịch, đạt ISO 22000 và HACCP, báo giá trong 24 giờ.",
  path: "/cung-cap-thuc-pham-long-thanh",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Long Thành",
});

export default function LongThanhLandingPage() {
  return <LocalLandingPage config={localLandingPages.longThanh} />;
}
