import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm tại Đồng Nai cho nhà hàng, bếp ăn",
  description:
    "TPS1 cung cấp rau củ, thịt cá, hàng đông lạnh, đồ khô cho nhà hàng, quán ăn, bếp công ty, trường học tại Đồng Nai, gồm cả khu vực Bình Phước cũ. Báo giá 24 giờ.",
  path: "/cung-cap-thuc-pham-dong-nai",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Đồng Nai",
});

export default function DongNaiLandingPage() {
  return <LocalLandingPage config={localLandingPages.dongNai} />;
}
