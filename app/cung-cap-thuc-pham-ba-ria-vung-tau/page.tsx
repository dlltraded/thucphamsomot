import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Bà Rịa - Vũng Tàu cho nhà hàng, bếp ăn",
  description:
    "TPS1 giao thực phẩm theo lịch cho nhà hàng, khách sạn ở Vũng Tàu và bếp ăn nhà máy tại Phú Mỹ, Bà Rịa. Đạt ISO 22000, HACCP; báo giá trong 24 giờ.",
  path: "/cung-cap-thuc-pham-ba-ria-vung-tau",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Bà Rịa - Vũng Tàu",
});

export default function BaRiaVungTauLandingPage() {
  return <LocalLandingPage config={localLandingPages.baRiaVungTau} />;
}
