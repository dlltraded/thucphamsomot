import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/content-page";
import { ArticleJsonLd } from "@/components/article-json-ld";
import { PageShell } from "@/components/page-shell";
import { getKnowledgeCover } from "@/lib/content-media";
import { readKnowledgeArticle, readKnowledgeArticles } from "@/lib/knowledge";
import { siteConfig } from "@/lib/site";
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
  const cover = getKnowledgeCover(item.slug);
  const relatedLinks = getRelatedKnowledgeLinks(item.slug);

  return (
    <PageShell eyebrow="Kiến thức" title={item.title} description={description}>
      <ArticleJsonLd
        type="BlogPosting"
        title={item.title}
        description={description}
        url={new URL(`/kien-thuc/${item.slug}`, siteConfig.url).toString()}
        image={new URL(cover, siteConfig.url).toString()}
        author={siteConfig.name}
      />
      <ContentPage
        title={item.title}
        description={description}
        sections={item.sections}
        faqs={item.faqs}
        relatedLinks={relatedLinks}
        heroMedia={{
          src: cover,
          alt: item.title,
          caption: "Ảnh minh hoạ thực tế",
        }}
      />
    </PageShell>
  );
}

function getRelatedKnowledgeLinks(slug: string) {
  const common = [
    { href: "/bao-gia", label: "Mở form báo giá", description: "Gửi nhu cầu để nhận phản hồi nhanh." },
    { href: "/san-pham", label: "Xem danh mục sản phẩm", description: "Xem nhóm hàng và quy cách cụ thể." },
  ];

  if (slug.includes("dong-nai")) {
    return [
      { href: "/cung-cap-thuc-pham-dong-nai", label: "Cung cấp thực phẩm Đồng Nai", description: "Landing page địa phương cho nhu cầu mua định kỳ." },
      { href: "/cung-cap-thuc-pham-bien-hoa", label: "Cung cấp thực phẩm Biên Hòa", description: "Trang địa phương cho khu vực Biên Hòa và lân cận." },
      ...common,
    ];
  }

  if (slug.includes("bien-hoa")) {
    return [
      { href: "/cung-cap-thuc-pham-bien-hoa", label: "Cung cấp thực phẩm Biên Hòa", description: "Trang địa phương bám nhu cầu báo giá nhanh ở Biên Hòa." },
      { href: "/cung-cap-thuc-pham-dong-nai", label: "Cung cấp thực phẩm Đồng Nai", description: "Trang khu vực rộng hơn cho đơn vị cần giao theo tuyến." },
      ...common,
    ];
  }

  if (slug.includes("binh-duong")) {
    return [
      { href: "/cung-cap-thuc-pham-binh-duong", label: "Cung cấp thực phẩm Bình Dương", description: "Trang địa phương cho khách cần nguồn hàng ổn định." },
      { href: "/cung-cap-thuc-pham-tp-hcm", label: "Cung cấp thực phẩm TP.HCM", description: "Trang khu vực lân cận để so sánh tuyến giao." },
      ...common,
    ];
  }

  if (slug.includes("nhon-trach")) {
    return [
      { href: "/cung-cap-thuc-pham-nhon-trach", label: "Cung cấp thực phẩm Nhơn Trạch", description: "Landing page cho khu công nghiệp và bếp ăn." },
      { href: "/cung-cap-thuc-pham-dong-nai", label: "Cung cấp thực phẩm Đồng Nai", description: "Trang khu vực để mở rộng tuyến phục vụ." },
      ...common,
    ];
  }

  if (slug.includes("tp-hcm")) {
    return [
      { href: "/cung-cap-thuc-pham-tp-hcm", label: "Cung cấp thực phẩm TP.HCM", description: "Trang địa phương cho đơn vị cần giao theo tuyến." },
      { href: "/cung-cap-thuc-pham-binh-duong", label: "Cung cấp thực phẩm Bình Dương", description: "Trang khu vực lân cận để so sánh nhu cầu." },
      ...common,
    ];
  }

  if (slug.includes("ba-ria-vung-tau")) {
    return [
      { href: "/cung-cap-thuc-pham-ba-ria-vung-tau", label: "Cung cấp thực phẩm Bà Rịa - Vũng Tàu", description: "Trang địa phương cho nhu cầu báo giá theo lịch." },
      { href: "/cung-cap-thuc-pham-tp-hcm", label: "Cung cấp thực phẩm TP.HCM", description: "Trang lân cận để mở rộng góc nhìn tuyến giao." },
      ...common,
    ];
  }

  return [
    { href: "/kien-thuc", label: "Quay lại Kiến thức", description: "Xem thêm bài viết khác." },
    ...common,
  ];
}
