import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Vĩnh Cửu cho bếp ăn công nhân",
  description: "Thực phẩm tươi, an toàn cho bếp ăn công nhân tại Vĩnh Cửu: giá sỉ theo sản lượng, giao theo lịch cố định, đạt ISO 22000 và HACCP.",
  path: "/cung-cap-thuc-pham-vinh-cuu",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Vĩnh Cửu",
});

export default function VinhCuuLandingPage() {
  return <LocalLandingPage config={localLandingPages.vinhCuu} />;
}
