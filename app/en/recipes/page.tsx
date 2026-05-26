import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ContentPage } from "@/components/content-page";
import { PageShell } from "@/components/page-shell";
import { makeMetadata } from "@/lib/seo";

export const metadata = makeMetadata({
  title: "Recipes and planning",
  description: "Kitchen planning notes and menu-oriented food supply content from TPS1.",
  path: "/en/recipes",
});

export default function EnglishRecipesPage() {
  return (
    <PageShell
      eyebrow="Recipes"
      title="Kitchen planning notes for B2B food service operations"
      description="Use these topics as a starting point for menu planning, ingredient grouping, and quote requests."
      locale="en"
    >
      <ContentPage
        title="From menu ideas to purchase lists"
        description="For B2B kitchens, a good menu needs a practical buying plan: quantity, substitutions, receiving time, and storage conditions."
        bullets={["Menu-to-ingredient planning", "Alternative product groups", "Receiving and storage notes", "Bulk order coordination"]}
        sections={[
          {
            heading: "What TPS1 can help clarify",
            body:
              "Customers can send a current menu, product group, or buying list. TPS1 will follow up to discuss quantity, specification, delivery rhythm, and suitable alternatives where needed.",
          },
        ]}
      />

      <Link href="/en/bao-gia" className="btn-primary">
        Send a planning request <ArrowRight size={18} />
      </Link>
    </PageShell>
  );
}
