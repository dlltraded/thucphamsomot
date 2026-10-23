import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm KCN Amata cho nhà máy FDI",
  description: "Thực phẩm cho bếp ăn nhà máy FDI tại KCN Amata: hệ thống ISO 22000 và HACCP, hồ sơ nhà cung cấp đầy đủ, giao theo ca, báo giá trong 24 giờ.",
  path: "/cung-cap-thuc-pham-kcn-amata",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại KCN Amata",
});

export default function AmataLandingPage() {
  return <LocalLandingPage config={localLandingPages.amata} />;
}
