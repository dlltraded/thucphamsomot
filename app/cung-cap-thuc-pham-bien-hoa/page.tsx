import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Biên Hòa cho bếp ăn tập thể, nhà máy và đơn vị suất ăn",
  description:
    "TPS1 nhận cung cấp thực phẩm tại Biên Hòa cho bếp ăn tập thể, nhà máy, trường học và đơn vị cần báo giá rõ ràng, giao đúng lịch.",
  path: "/cung-cap-thuc-pham-bien-hoa",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Biên Hòa",
});

export default function BienHoaLandingPage() {
  return <LocalLandingPage config={localLandingPages.bienHoa} />;
}
