import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: localLandingPages.longThanh.title,
  description: localLandingPages.longThanh.description,
  path: "/cung-cap-thuc-pham-long-thanh",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Long Thành",
});

export default function LongThanhLandingPage() {
  return <LocalLandingPage config={localLandingPages.longThanh} />;
}
