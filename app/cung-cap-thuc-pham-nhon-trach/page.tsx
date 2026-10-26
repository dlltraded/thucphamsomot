import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Nhơn Trạch cho bếp ăn nhà máy, nhà hàng",
  description:
    "TPS1 giao thực phẩm theo ca cho bếp ăn các KCN Nhơn Trạch, đơn vị suất ăn và nhà hàng. Đạt ISO 22000, HACCP, bảo hiểm sản phẩm 5 tỷ; báo giá trong 24 giờ.",
  path: "/cung-cap-thuc-pham-nhon-trach",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Nhơn Trạch",
});

export default function NhonTrachLandingPage() {
  return <LocalLandingPage config={localLandingPages.nhonTrach} />;
}
