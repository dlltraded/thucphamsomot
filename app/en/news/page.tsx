import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ContentPage } from "@/components/content-page";
import { PageShell } from "@/components/page-shell";
import { makeMetadata } from "@/lib/seo";

export const metadata = makeMetadata({
  title: "News",
  description: "Updates and business information from Thuc Pham So Mot.",
  path: "/en/news",
});

export default function EnglishNewsPage() {
  return (
    <PageShell
      eyebrow="News"
      title="Updates from Thuc Pham So Mot"
      description="Company updates, service notes, and practical information for customers and supplier partners."
      locale="en"
    >
      <ContentPage
        title="Business updates will be published here"
        description="The English news page is prepared for visitors who need company updates, supply notes, or new service announcements."
        bullets={["Company updates", "Supply notes", "B2B service announcements", "Customer and supplier information"]}
        sections={[
          {
            heading: "Need information now?",
            body:
              "If you are a buyer or supplier, the fastest path is to send a request through the English form so the TPS1 team can follow up with the right information.",
          },
        ]}
      />

      <Link href="/en/bao-gia" className="btn-primary">
        Send request <ArrowRight size={18} />
      </Link>
    </PageShell>
  );
}
