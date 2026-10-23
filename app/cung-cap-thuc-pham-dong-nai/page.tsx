import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Đồng Nai cho bếp ăn, nhà máy",
  description:
    "TPS1 cung cấp rau củ, thịt cá, hàng đông lạnh và đồ khô cho bếp ăn tập thể, nhà máy, trường học, bệnh viện tại Đồng Nai. Giao theo lịch, báo giá trong 24 giờ.",
  path: "/cung-cap-thuc-pham-dong-nai",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Đồng Nai",
});

export default function DongNaiLandingPage() {
  return <LocalLandingPage config={localLandingPages.dongNai} />;
}
