import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Bình Dương cho bếp ăn, nhà máy và đơn vị suất ăn",
  description:
    "TPS1 nhận cung cấp thực phẩm tại Bình Dương cho bếp ăn tập thể, nhà máy, trường học, bệnh viện và đơn vị cần nguồn hàng ổn định.",
  path: "/cung-cap-thuc-pham-binh-duong",
});

export default function BinhDuongLandingPage() {
  return <LocalLandingPage config={localLandingPages.binhDuong} />;
}
