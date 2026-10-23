import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm tại Biên Hòa cho bếp ăn, nhà máy",
  description:
    "Nguồn thực phẩm cho bếp ăn tập thể, nhà máy và trường học tại Biên Hòa: báo giá rõ ràng, giao đúng lịch, có hóa đơn VAT và hồ sơ an toàn thực phẩm.",
  path: "/cung-cap-thuc-pham-bien-hoa",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Biên Hòa",
});

export default function BienHoaLandingPage() {
  return <LocalLandingPage config={localLandingPages.bienHoa} />;
}
