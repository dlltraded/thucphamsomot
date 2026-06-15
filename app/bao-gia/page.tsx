import { cookies } from "next/headers";
import { makeMetadata } from "@/lib/seo";
import { PageShell } from "@/components/page-shell";
import { QuotePortal } from "@/components/quote-portal";

export const metadata = makeMetadata({
  title: "Báo giá & chào hàng | Quote",
  description: "Người mua điền form online, nhà cung cấp điền form trên web bằng tiếng Việt.",
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
      } else if (parsed?.kind === "error" && parsed.message) {
        initialNotice = parsed;
      }
    } catch {
      // Ignore malformed cookie payloads.
    }
  }

  return (
    <PageShell eyebrow="Báo giá" title="Gửi nhu cầu mua hàng hoặc chào hàng" compact>
      <QuotePortal initialNotice={initialNotice} locale="vi" />
    </PageShell>
  );
}
