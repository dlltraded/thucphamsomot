import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Trảng Bom cho bếp ăn nhà máy",
  description: "Thực phẩm sỉ cho bếp ăn công nghiệp tại Trảng Bom, KCN Bàu Xéo và Giang Điền: giao theo lịch cố định, giá theo sản lượng, hóa đơn VAT đầy đủ.",
  path: "/cung-cap-thuc-pham-trang-bom",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Trảng Bom",
});

export default function TrangBomLandingPage() {
  return <LocalLandingPage config={localLandingPages.trangBom} />;
}
