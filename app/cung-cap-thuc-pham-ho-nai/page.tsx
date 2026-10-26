import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Hố Nai cho bếp ăn nhà máy, quán ăn",
  description:
    "Gần kho TPS1 tại Biên Hòa, bếp ăn nhà máy và quán ăn khu vực Hố Nai nhận hàng trước giờ sơ chế. Đạt ISO 22000, HACCP; báo giá trong 24 giờ.",
  path: "/cung-cap-thuc-pham-ho-nai",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Hố Nai",
});

export default function HoNaiLandingPage() {
  return <LocalLandingPage config={localLandingPages.hoNai} />;
}
