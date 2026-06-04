import type { Metadata } from "next";
import { makeMetadata } from "@/lib/seo";
import { localLandingPages } from "@/lib/local-landing-content";
import { LocalLandingPage } from "@/components/local-landing-page";

export const metadata: Metadata = makeMetadata({
  title: "Cung cấp thực phẩm Nhơn Trạch cho khu công nghiệp và bếp ăn",
  description:
    "TPS1 nhận cung cấp thực phẩm tại Nhơn Trạch cho khu công nghiệp, bếp ăn tập thể, trường học và nhà máy cần giao định kỳ.",
  path: "/cung-cap-thuc-pham-nhon-trach",
});

export default function NhonTrachLandingPage() {
  return <LocalLandingPage config={localLandingPages.nhonTrach} />;
}
