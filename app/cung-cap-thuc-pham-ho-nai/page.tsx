import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: localLandingPages.hoNai.title,
  description: localLandingPages.hoNai.description,
  path: "/cung-cap-thuc-pham-ho-nai",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Hố Nai",
});

export default function HoNaiLandingPage() {
  return <LocalLandingPage config={localLandingPages.hoNai} />;
}
