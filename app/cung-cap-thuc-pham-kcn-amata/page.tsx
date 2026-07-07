import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: localLandingPages.amata.title,
  description: localLandingPages.amata.description,
  path: "/cung-cap-thuc-pham-kcn-amata",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại KCN Amata",
});

export default function AmataLandingPage() {
  return <LocalLandingPage config={localLandingPages.amata} />;
}
