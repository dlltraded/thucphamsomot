import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm tại TP.HCM cho nhà hàng, bếp ăn",
  description:
    "Tuyến giao từ Biên Hòa về TP. Thủ Đức và khu Đông TP.HCM: rau củ, thịt cá, hàng đông lạnh, đồ khô cho nhà hàng, quán ăn, bếp ăn. Báo giá trong 24 giờ.",
  path: "/cung-cap-thuc-pham-tp-hcm",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại TP.HCM",
});

export default function TpHcmLandingPage() {
  return <LocalLandingPage config={localLandingPages.tpHcm} />;
}
