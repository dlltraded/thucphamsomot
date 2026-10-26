import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm tại Bình Dương cho nhà hàng, bếp ăn",
  description:
    "TPS1 giao thực phẩm có nguồn gốc rõ ràng theo lịch cho nhà hàng, quán ăn và bếp ăn nhà máy tại Bình Dương. Đạt ISO 22000, HACCP; báo giá trong 24 giờ.",
  path: "/cung-cap-thuc-pham-binh-duong",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Bình Dương",
});

export default function BinhDuongLandingPage() {
  return <LocalLandingPage config={localLandingPages.binhDuong} />;
}
