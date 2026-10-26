import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm tại Bình Phước cho nhà hàng, bếp ăn",
  description:
    "TPS1 giao rau củ, thịt cá, hàng đông lạnh, đồ khô theo tuyến định kỳ đến nhà hàng, quán ăn, bếp ăn khu vực Bình Phước cũ (nay thuộc Đồng Nai). Báo giá trong 24 giờ.",
  path: "/cung-cap-thuc-pham-binh-phuoc",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Khu vực Bình Phước",
});

export default function BinhPhuocLandingPage() {
  return <LocalLandingPage config={localLandingPages.binhPhuoc} />;
}
