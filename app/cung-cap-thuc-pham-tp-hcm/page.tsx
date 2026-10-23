import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm TP.HCM cho bếp ăn công nghiệp",
  description:
    "Nguồn cung thực phẩm ổn định cho bếp ăn công nghiệp, nhà máy, xí nghiệp tại TP.HCM: báo giá trong 24 giờ, giao theo lịch, đạt ISO 22000 và HACCP.",
  path: "/cung-cap-thuc-pham-tp-hcm",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại TP.HCM",
});

export default function TpHcmLandingPage() {
  return <LocalLandingPage config={localLandingPages.tpHcm} />;
}
