import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Vĩnh Cửu cho bếp ăn, nhà hàng, quán ăn",
  description:
    "TPS1 giao thực phẩm có nguồn gốc rõ ràng theo tuyến cho bếp ăn nhà máy, trường học, nhà hàng, quán ăn tại Vĩnh Cửu. Đạt ISO 22000, HACCP; linh hoạt thanh toán.",
  path: "/cung-cap-thuc-pham-vinh-cuu",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Vĩnh Cửu",
});

export default function VinhCuuLandingPage() {
  return <LocalLandingPage config={localLandingPages.vinhCuu} />;
}
