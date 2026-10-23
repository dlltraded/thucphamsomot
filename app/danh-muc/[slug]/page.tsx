import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-json-ld";
import { ContentPage } from "@/components/content-page";
import { PageShell } from "@/components/page-shell";
import { SkuCatalogList } from "@/components/sku-catalog-list";
import { categories, findBySlug } from "@/lib/content";
import { makeMetadata } from "@/lib/seo";
import { findSkuGroup, getSkuPage, type SkuPage } from "@/lib/sku-catalog";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ trang?: string }>;
};

function parsePage(value: string | undefined) {
  const page = parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 1 ? page : 1;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = parsePage((await searchParams).trang);
  const item = findBySlug(categories, slug);
  if (!item) return makeMetadata({ title: "Danh mục", path: `/danh-muc/${slug}` });
  const title = `Cung cấp ${item.title.toLocaleLowerCase("vi")} cho bếp ăn công nghiệp tại Đồng Nai`;
  return makeMetadata({
    title: page > 1 ? `${title} – trang ${page}` : title,
    description: item.description,
    path: page > 1 ? `/danh-muc/${item.slug}?trang=${page}` : `/danh-muc/${item.slug}`,
  });
}

export default async function CategoryDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const page = parsePage((await searchParams).trang);
  const item = findBySlug(categories, slug);
  if (!item) return notFound();
  const description = item.description ?? item.title;

  const group = findSkuGroup(item.slug);
  let catalog: SkuPage | undefined;
  if (group) {
    try {
      catalog = await getSkuPage({ group: group.slug, page, revalidate: 3600 });
    } catch (error) {
      console.error(`[danh-muc/${slug}] catalog fetch failed`, error);
    }
  }
  if (catalog && page > catalog.totalPages) return notFound();

  return (
    <PageShell eyebrow="Danh mục" title={item.title} description={description}>
      <BreadcrumbJsonLd
        items={[
          { name: "Trang chủ", item: "/" },
          { name: "Sản phẩm", item: "/san-pham" },
          { name: item.title, item: `/danh-muc/${item.slug}` },
        ]}
      />
      <ContentPage
        title={item.title}
        description={description}
        bullets={item.highlights}
        sections={item.sections}
        faqs={item.faqs}
        relatedLinks={item.relatedLinks}
      >
        {catalog ? (
          <SkuCatalogList data={catalog} basePath={`/danh-muc/${item.slug}`} title={`Sản phẩm ${item.title.toLocaleLowerCase("vi")}`} />
        ) : null}
      </ContentPage>
    </PageShell>
  );
}
