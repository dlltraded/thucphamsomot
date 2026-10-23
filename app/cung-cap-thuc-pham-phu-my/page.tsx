import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm KCN Phú Mỹ cho bếp ăn nhà máy",
  description: "Rau củ, thịt cá, gia vị cho bếp ăn nhà máy thép, cảng biển và các khu công nghiệp tại thị xã Phú Mỹ. Giao tận bếp, báo giá trong 24 giờ.",
  path: "/cung-cap-thuc-pham-phu-my",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Phú Mỹ",
});

export default function PhuMyLandingPage() {
  return <LocalLandingPage config={localLandingPages.phuMy} />;
}
