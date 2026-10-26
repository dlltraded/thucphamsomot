import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm KCN Tam Phước cho bếp ăn",
  description:
    "Thực phẩm có nguồn gốc rõ ràng cho bếp ăn nhà máy tại KCN Tam Phước: hơn 5.000 mặt hàng, giao đúng lịch, hóa đơn VAT, chứng nhận ISO 22000 và HACCP.",
  path: "/cung-cap-thuc-pham-tam-phuoc",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Tam Phước",
});

export default function TamPhuocLandingPage() {
  return <LocalLandingPage config={localLandingPages.tamPhuoc} />;
}
