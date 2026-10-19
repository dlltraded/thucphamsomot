import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { segmentLandingPages } from "@/lib/segment-landing-content";
import { SegmentLandingPage } from "@/components/segment-landing-page";

const config = segmentLandingPages.coQuan;

export const metadata: Metadata = makeMetadata({
  title: config.metaTitle,
  description: config.metaDescription,
  path: config.path,
});

export default function OfficeFoodSupplyPage() {
  return <SegmentLandingPage config={config} />;
}
