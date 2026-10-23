import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm KCN Tam Phước cho bếp ăn",
  description: "Nhà cung cấp thực phẩm sỉ cho bếp ăn công nghiệp tại KCN Tam Phước: nguồn hàng đa dạng, giá minh bạch, giao đúng lịch, có hóa đơn VAT.",
  path: "/cung-cap-thuc-pham-tam-phuoc",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Tam Phước",
});

export default function TamPhuocLandingPage() {
  return <LocalLandingPage config={localLandingPages.tamPhuoc} />;
}
