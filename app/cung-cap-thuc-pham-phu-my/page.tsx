import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: localLandingPages.phuMy.title,
  description: localLandingPages.phuMy.description,
  path: "/cung-cap-thuc-pham-phu-my",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Phú Mỹ",
});

export default function PhuMyLandingPage() {
  return <LocalLandingPage config={localLandingPages.phuMy} />;
}
