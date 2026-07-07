import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: localLandingPages.tamPhuoc.title,
  description: localLandingPages.tamPhuoc.description,
  path: "/cung-cap-thuc-pham-tam-phuoc",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Tam Phước",
});

export default function TamPhuocLandingPage() {
  return <LocalLandingPage config={localLandingPages.tamPhuoc} />;
}
