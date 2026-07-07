import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Đồng Nai cho bếp ăn tập thể, nhà máy và trường học",
  description:
    "TPS1 phục vụ khách tại Đồng Nai cần nguồn hàng định kỳ, báo giá nhanh, chuyên mảng bếp ăn tập thể, nhà máy, trường học, bệnh viện.",
  path: "/cung-cap-thuc-pham-dong-nai",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Đồng Nai",
});

export default function DongNaiLandingPage() {
  return <LocalLandingPage config={localLandingPages.dongNai} />;
}
