import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm tại Biên Hòa cho nhà hàng, bếp ăn",
  description:
    "Kho TPS1 đặt tại Tam Hiệp, Biên Hòa: giao rau củ, thịt cá, đồ khô đúng giờ cho nhà hàng, quán ăn, bếp nhà máy, trường học. Hóa đơn VAT, báo giá trong 24 giờ.",
  path: "/cung-cap-thuc-pham-bien-hoa",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Biên Hòa",
});

export default function BienHoaLandingPage() {
  return <LocalLandingPage config={localLandingPages.bienHoa} />;
}
