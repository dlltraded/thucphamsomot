import { cookies } from "next/headers";
import { makeMetadata } from "@/lib/seo";
import { PageShell } from "@/components/page-shell";
import { QuotePortal } from "@/components/quote-portal";

export const metadata = makeMetadata({
  title: "Báo giá & chào hàng | Quote",
  description: "Người mua điền form online, nhà cung cấp tải form pre-qualification và gửi về phongthumua@thucphamsomot.vn.",
  path: "/bao-gia",
});

const QUOTE_NOTICE_COOKIE = "tps1_quote_notice_v1";

type QuoteNotice =
  | {
      kind: "success";
      summary: {
        name: string;
        company: string;
        inquiryType: "buyer" | "supplier";
        primaryNeed: string;
        secondaryNeed: string;
      };
    }
  | {
      kind: "error";
      message: string;
    };

export default async function QuotePage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(QUOTE_NOTICE_COOKIE)?.value;

  let initialNotice: QuoteNotice | null = null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as QuoteNotice;
      if (
        parsed?.kind === "success" &&
        parsed.summary?.name &&
        parsed.summary?.company &&
        parsed.summary?.primaryNeed &&
        parsed.summary?.secondaryNeed
      ) {
        initialNotice = parsed;
      } else if (
        parsed?.kind === "success" &&
        parsed.summary?.name &&
        (parsed.summary as unknown as { facilityType?: string }).facilityType &&
        (parsed.summary as unknown as { interestedIn?: string }).interestedIn &&
        (parsed.summary as unknown as { deliveryArea?: string }).deliveryArea
      ) {
        initialNotice = {
          kind: "success",
          summary: {
            name: parsed.summary.name,
            company: parsed.summary.company || "Chưa ghi công ty",
            inquiryType: "buyer",
            primaryNeed: (parsed.summary as unknown as { interestedIn?: string }).interestedIn || "Nhóm hàng chưa ghi rõ",
            secondaryNeed: `Khu vực giao: ${(parsed.summary as unknown as { deliveryArea?: string }).deliveryArea || "chưa ghi"}`,
          },
        };
      }
      if (parsed?.kind === "error" && parsed.message) {
        initialNotice = parsed;
      }
    } catch {
      // Ignore malformed cookie payloads.
    }
  }

  return (
    <PageShell eyebrow="Yêu cầu báo giá" title="Gửi nhu cầu mua hàng hoặc chào hàng" compact>
      <QuotePortal initialNotice={initialNotice} />
    </PageShell>
  );
}
