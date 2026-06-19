import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { FlipbookWrapper } from "@/components/flipbook-wrapper";

export const metadata: Metadata = makeMetadata({
  title: "Hồ sơ năng lực",
  description: "Xem hồ sơ năng lực TPS1, năng lực cung ứng và thông tin giới thiệu công ty.",
  path: "/ho-so-nang-luc",
});

export default function CompanyProfilePage() {
  return (
    <main className="min-h-screen bg-gray-900">
      <FlipbookWrapper file="/docs/tps1-profile.pdf" />
    </main>
  );
}
