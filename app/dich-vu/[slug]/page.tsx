import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/content-page";
import { PageShell } from "@/components/page-shell";
import { findBySlug, services } from "@/lib/content";
import { makeMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return services.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = findBySlug(services, slug);
  if (!item) return makeMetadata({ title: "Dịch vụ", path: `/dich-vu/${slug}` });
  return makeMetadata({
    title: item.title,
    description: item.description,
    path: `/dich-vu/${item.slug}`,
  });
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = findBySlug(services, slug);
  if (!item) return notFound();
  const description = item.description ?? item.title;

  return (
    <PageShell eyebrow="Dịch vụ" title={item.title} description={description}>
      <ContentPage title={item.title} description={description} sections={item.sections} faqs={item.faqs} />
    </PageShell>
  );
}
