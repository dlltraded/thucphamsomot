import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm TP.HCM cho bếp ăn công nghiệp và doanh nghiệp",
  description:
    "TPS1 phục vụ khách tại TP.HCM cần nguồn cung thực phẩm ổn định, báo giá nhanh, chuyên cho bếp ăn công nghiệp, nhà máy, xí nghiệp.",
  path: "/cung-cap-thuc-pham-tp-hcm",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại TP.HCM",
});

export default function TpHcmLandingPage() {
  return <LocalLandingPage config={localLandingPages.tpHcm} />;
}
