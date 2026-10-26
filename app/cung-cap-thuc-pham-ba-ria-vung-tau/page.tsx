import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Bà Rịa - Vũng Tàu cho bếp ăn",
  description:
    "Nguồn thực phẩm theo lịch định kỳ cho doanh nghiệp, xí nghiệp và bếp ăn tập thể tại Bà Rịa - Vũng Tàu; báo giá rõ ràng, có hóa đơn VAT đầy đủ.",
  path: "/cung-cap-thuc-pham-ba-ria-vung-tau",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Bà Rịa - Vũng Tàu",
});

export default function BaRiaVungTauLandingPage() {
  return <LocalLandingPage config={localLandingPages.baRiaVungTau} />;
}
