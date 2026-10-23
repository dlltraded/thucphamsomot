import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm KCN Hố Nai cho bếp ăn công nhân",
  description: "Thực phẩm tươi cho bếp ăn công nhân tại KCN Hố Nai: giao tận bếp theo khung giờ ca làm việc, đạt ISO 22000 và HACCP, báo giá trong 24 giờ.",
  path: "/cung-cap-thuc-pham-ho-nai",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Hố Nai",
});

export default function HoNaiLandingPage() {
  return <LocalLandingPage config={localLandingPages.hoNai} />;
}
