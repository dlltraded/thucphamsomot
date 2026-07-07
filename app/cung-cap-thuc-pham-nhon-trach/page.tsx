import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Nhơn Trạch cho khu công nghiệp và bếp ăn",
  description:
    "TPS1 phục vụ KCN Nhơn Trạch, chuyên giao định kỳ các nhóm hàng rau củ, thịt cá, đông lạnh, có xuất hóa đơn rõ ràng, giá cạnh tranh.",
  path: "/cung-cap-thuc-pham-nhon-trach",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Nhơn Trạch",
});

export default function NhonTrachLandingPage() {
  return <LocalLandingPage config={localLandingPages.nhonTrach} />;
}
