import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/content-page";
import { PageShell } from "@/components/page-shell";
import { findBySlug, policies } from "@/lib/content";
import { makeMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return policies.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = findBySlug(policies, slug);
  if (!item) return makeMetadata({ title: "Chính sách", path: `/chinh-sach/${slug}` });
  return makeMetadata({
    title: item.title,
    description: item.description,
    path: `/chinh-sach/${item.slug}`,
  });
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = findBySlug(policies, slug);
  if (!item) return notFound();
  const description = item.description ?? item.title;

  return (
    <PageShell eyebrow="Chính sách" title={item.title} description={description}>
      <ContentPage title={item.title} description={description} sections={item.sections} faqs={item.faqs} />
    </PageShell>
  );
}
