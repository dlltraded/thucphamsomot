import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/content-page";
import { PageShell } from "@/components/page-shell";
import { findBySlug, industries } from "@/lib/content";
import { makeMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return industries.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = findBySlug(industries, slug);
  if (!item) return makeMetadata({ title: "Ngành hàng", path: `/nganh-hang/${slug}` });
  return makeMetadata({
    title: item.title,
    description: item.description,
    path: `/nganh-hang/${item.slug}`,
  });
}

export default async function IndustryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = findBySlug(industries, slug);
  if (!item) return notFound();
  const description = item.description ?? item.title;

  return (
    <PageShell eyebrow="Ngành hàng" title={item.title} description={description}>
      <ContentPage
        title={item.title}
        description={description}
        bullets={item.targets}
        sections={item.sections}
        faqs={item.faqs}
      />
    </PageShell>
  );
}
