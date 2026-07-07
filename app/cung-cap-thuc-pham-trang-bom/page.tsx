import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: localLandingPages.trangBom.title,
  description: localLandingPages.trangBom.description,
  path: "/cung-cap-thuc-pham-trang-bom",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Trảng Bom",
});

export default function TrangBomLandingPage() {
  return <LocalLandingPage config={localLandingPages.trangBom} />;
}
