import { cookies } from "next/headers";
import { makeMetadata } from "@/lib/seo";
import { PageShell } from "@/components/page-shell";
import { QuotePortal } from "@/components/quote-portal";

export const metadata = makeMetadata({
  title: "Báo giá",
  description: "Gửi nhanh nhu cầu báo giá để đội ngũ sale tiếp nhận và phản hồi phương án phù hợp.",
  path: "/bao-gia",
});

const QUOTE_NOTICE_COOKIE = "tps1_quote_notice_v1";

type QuoteNotice =
  | {
      kind: "success";
      summary: {
        name: string;
        facilityType: string;
        interestedIn: string;
        deliveryArea: string;
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
      if (parsed?.kind === "success" && parsed.summary?.name && parsed.summary?.facilityType) {
        initialNotice = parsed;
      }
      if (parsed?.kind === "error" && parsed.message) {
        initialNotice = parsed;
      }
    } catch {
      // Ignore malformed cookie payloads.
    }
  }

  return (
    <PageShell eyebrow="Yêu cầu báo giá" title="Gửi nhu cầu để sale phản hồi nhanh" compact>
      <QuotePortal initialNotice={initialNotice} />
    </PageShell>
  );
}
