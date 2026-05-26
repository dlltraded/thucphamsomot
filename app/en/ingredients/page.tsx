import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";
import { ContentPage } from "@/components/content-page";
import { PageShell } from "@/components/page-shell";
import { makeMetadata } from "@/lib/seo";

export const metadata = makeMetadata({
  title: "Ingredients",
  description: "Ingredient categories and B2B supply orientation for TPS1 customers.",
  path: "/en/ingredients",
});

export default function EnglishIngredientsPage() {
  return (
    <PageShell
      eyebrow="Ingredients"
      title="Ingredient categories for professional kitchens and recurring purchase plans"
      description="Start from the ingredient group, then send the quantity, delivery schedule, and special requirements."
      locale="en"
    >
      <ContentPage
        title="A practical structure for B2B food purchasing"
        description="TPS1 groups ingredients around how canteens and kitchens operate, not around retail shopping behavior."
        bullets={["Fresh produce", "Meat and seafood", "Frozen food", "Kitchen seasonings", "Vegan ingredients"]}
        sections={[
          {
            heading: "How to request",
            body:
              "Choose the product group closest to your demand. If your buying list is not finalized, send an overview and TPS1 will follow up to clarify specification, packing, delivery area, and receiving time.",
            items: ["Product group", "Estimated quantity", "Delivery area", "Frequency", "Special handling requirements"],
          },
        ]}
      />

      <div className="product-category-list">
        {["Fresh produce", "Meat and seafood", "Frozen food", "Seasonings", "Vegan ingredients"].map((item) => (
          <Link key={item} href="/en/bao-gia" className="product-category-link">
            <span>
              <Leaf size={16} />
              {item}
            </span>
            <ArrowRight size={16} />
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
