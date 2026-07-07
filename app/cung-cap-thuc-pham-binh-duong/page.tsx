import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Bình Dương cho bếp ăn tập thể và nhà máy",
  description:
    "TPS1 cung cấp thực phẩm tại Bình Dương, chuyên mảng bếp ăn tập thể, xí nghiệp, trường học với quy trình giao nhận rõ ràng và báo giá nhanh.",
  path: "/cung-cap-thuc-pham-binh-duong",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Bình Dương",
});

export default function BinhDuongLandingPage() {
  return <LocalLandingPage config={localLandingPages.binhDuong} />;
}
