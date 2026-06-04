import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Bà Rịa - Vũng Tàu cho doanh nghiệp và bếp ăn",
  description:
    "TPS1 nhận cung cấp thực phẩm tại Bà Rịa - Vũng Tàu cho doanh nghiệp, bếp ăn tập thể, trường học, bệnh viện và đơn vị cần giao hàng theo lịch.",
  path: "/cung-cap-thuc-pham-ba-ria-vung-tau",
});

export default function BaRiaVungTauLandingPage() {
  return <LocalLandingPage config={localLandingPages.baRiaVungTau} />;
}
