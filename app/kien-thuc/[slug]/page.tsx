import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/content-page";
import { PageShell } from "@/components/page-shell";
import { readKnowledgeArticle, readKnowledgeArticles } from "@/lib/knowledge";
import { makeMetadata } from "@/lib/seo";

export async function generateStaticParams() {
  const articles = await readKnowledgeArticles();
  return articles.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await readKnowledgeArticle(slug);
  if (!item) return makeMetadata({ title: "Kiến thức", path: `/kien-thuc/${slug}` });
  return makeMetadata({
    title: item.title,
    description: item.description,
    path: `/kien-thuc/${item.slug}`,
  });
}

export default async function KnowledgeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await readKnowledgeArticle(slug);
  if (!item) return notFound();
  const description = item.description ?? item.title;

  return (
    <PageShell eyebrow="Kiến thức" title={item.title} description={description}>
      <ContentPage title={item.title} description={description} sections={item.sections} faqs={item.faqs} />
    </PageShell>
  );
}
