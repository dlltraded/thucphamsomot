import { ContentPage } from "@/components/content-page";
import { PageShell } from "@/components/page-shell";
import { makeMetadata } from "@/lib/seo";

export const metadata = makeMetadata({
  title: "About TPS1",
  description: "About Thuc Pham So Mot, a B2B food supply partner in Dong Nai.",
  path: "/en/about",
});

export default function EnglishAboutPage() {
  return (
    <PageShell
      eyebrow="About"
      title="Thuc Pham So Mot serves organizations that buy food ingredients by system"
      description="TPS1 focuses on B2B food supply for canteens, industrial catering, schools, hospitals, restaurants, and hospitality operators."
      locale="en"
    >
      <ContentPage
        title="Stable food supply for kitchens, restaurants, and industrial catering teams"
        description="Our website is built as a clear catalog and request flow, helping B2B buyers quickly explain what they need and helping suppliers pitch relevant product groups."
        bullets={[
          "Organized product groups for recurring B2B buying",
          "Practical delivery planning for kitchens and canteens",
          "Quote response based on volume, delivery area, and specifications",
          "Clear communication for buyers and supplier partners",
        ]}
        sections={[
          {
            heading: "Service direction",
            body:
              "TPS1 is not designed as a retail checkout store. The focus is catalog browsing, request collection, and follow-up quotation for customers with recurring or bulk food supply needs.",
            items: ["Fresh vegetables", "Meat and seafood", "Frozen food", "Kitchen seasonings", "Vegan products"],
          },
        ]}
      />
    </PageShell>
  );
}
