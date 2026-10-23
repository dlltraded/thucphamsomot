import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm KCN Nhơn Trạch cho bếp ăn",
  description:
    "TPS1 cung cấp rau củ, thịt cá, hàng đông lạnh cho bếp ăn các khu công nghiệp Nhơn Trạch. Giao theo lịch cố định, giá cạnh tranh, hóa đơn VAT đầy đủ.",
  path: "/cung-cap-thuc-pham-nhon-trach",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Nhơn Trạch",
});

export default function NhonTrachLandingPage() {
  return <LocalLandingPage config={localLandingPages.nhonTrach} />;
}
