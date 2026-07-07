import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: localLandingPages.vinhCuu.title,
  description: localLandingPages.vinhCuu.description,
  path: "/cung-cap-thuc-pham-vinh-cuu",
  ogTitle: "Cung Cấp Thực Phẩm",
  ogSubtitle: "Tại Vĩnh Cửu",
});

export default function VinhCuuLandingPage() {
  return <LocalLandingPage config={localLandingPages.vinhCuu} />;
}
