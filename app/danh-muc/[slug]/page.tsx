import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/content-page";
import { PageShell } from "@/components/page-shell";
import { categories, findBySlug } from "@/lib/content";
import { makeMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return categories.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = findBySlug(categories, slug);
  if (!item) return makeMetadata({ title: "Danh mục", path: `/danh-muc/${slug}` });
  return makeMetadata({
    title: item.title,
    description: item.description,
    path: `/danh-muc/${item.slug}`,
  });
}

export default async function CategoryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = findBySlug(categories, slug);
  if (!item) return notFound();
  const description = item.description ?? item.title;

  return (
    <PageShell eyebrow="Danh mục" title={item.title} description={description}>
      <ContentPage
        title={item.title}
        description={description}
        bullets={item.highlights}
        sections={item.sections}
        faqs={item.faqs}
      />
    </PageShell>
  );
}
