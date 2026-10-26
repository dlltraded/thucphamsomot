import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Trảng Bom cho bếp ăn nhà máy, quán ăn",
  description:
    "Thực phẩm cho bếp ăn nhà máy tại KCN Bàu Xéo, Sông Mây, Giang Điền và quán ăn ở Trảng Bom: giao theo lịch, hàng phân loại theo quy cách, hóa đơn VAT.",
  path: "/cung-cap-thuc-pham-trang-bom",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Trảng Bom",
});

export default function TrangBomLandingPage() {
  return <LocalLandingPage config={localLandingPages.trangBom} />;
}
