import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Đồng Nai cho bếp ăn, nhà máy và trường học",
  description:
    "TPS1 cung cấp thực phẩm định kỳ tại Đồng Nai cho bếp ăn, nhà máy, trường học, bệnh viện và đơn vị cần nguồn hàng ổn định.",
  path: "/cung-cap-thuc-pham-dong-nai",
});

export default function DongNaiLandingPage() {
  return <LocalLandingPage config={localLandingPages.dongNai} />;
}
