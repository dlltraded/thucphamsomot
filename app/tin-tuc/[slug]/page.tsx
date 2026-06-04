import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, Tag } from "lucide-react";
import { makeMetadata } from "@/lib/seo";
import { formatNewsDate, readNewsArticle, splitNewsContent } from "@/lib/news";
import { ArticleJsonLd } from "@/components/article-json-ld";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await readNewsArticle(slug);

  if (!article) {
    return makeMetadata({
      title: "Tin tức",
      description: "Bài viết không tồn tại.",
      path: `/tin-tuc/${slug}`,
    });
  }

  return makeMetadata({
    title: article.title,
    description: article.excerpt,
    path: `/tin-tuc/${article.slug}`,
  });
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await readNewsArticle(slug);

  if (!article) {
    notFound();
  }

  return (
    <main className="news-detail">
      <section className="container-shell news-detail__hero">
        <ArticleJsonLd
          type="BlogPosting"
          title={article.title}
          description={article.excerpt}
          url={new URL(`/tin-tuc/${article.slug}`, siteConfig.url).toString()}
          image={new URL(article.coverImage, siteConfig.url).toString()}
          author={article.author}
          datePublished={article.publishedAt}
        />
        <Link href="/tin-tuc" className="text-link">
          <ArrowLeft size={16} />
          Quay lại tin tức
        </Link>

        <div className="news-detail__layout">
          <div className="news-detail__copy">
            <div className="news-meta">
              <span>
                <Tag size={14} />
                {article.category}
              </span>
              <span>
                <CalendarDays size={14} />
                {formatNewsDate(article.publishedAt)}
              </span>
              <span>
                <Clock3 size={14} />
                {article.readingTime}
              </span>
            </div>
            <h1>{article.title}</h1>
            <p>{article.excerpt}</p>
          </div>

          <div className="news-detail__media">
            <Image src={article.coverImage} alt={article.title} fill priority className="news-detail__image" />
          </div>
        </div>
      </section>

      <section className="container-shell news-detail__body">
        {splitNewsContent(article.content).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <section className="content-section" style={{ marginTop: 28 }}>
          <div className="content-section__body">
            <div className="content-section__eyebrow">Đường đi tiếp theo</div>
            <h2>Trang nên xem sau khi đọc bài tin tức này.</h2>
            <p>
              Các liên kết dưới đây giúp người đọc đi từ nội dung tin tức sang danh mục, bài kiến thức và form báo giá để không bị dừng ở mức đọc tin.
            </p>
            <div className="home-local__grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 14 }}>
              {getRelatedNewsLinks(article.slug).map((item) => (
                <Link key={item.href} href={item.href} className="home-local__card" style={{ minHeight: 0 }}>
                  <h3>{item.label}</h3>
                  <p>{item.description}</p>
                  <span className="home-local__link">
                    Xem trang <ArrowRight size={16} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function getRelatedNewsLinks(slug: string) {
  const common = [
    { href: "/kien-thuc", label: "Xem Kiến thức", description: "Các bài hướng dẫn nền tảng về mua hàng và vận hành." },
    { href: "/san-pham", label: "Xem sản phẩm", description: "Danh mục để đi tiếp sang nhóm hàng và quy cách." },
    { href: "/bao-gia", label: "BÁO GIÁ", description: "Chuyển sang form báo giá để chốt nhu cầu." },
  ];

  if (slug.includes("nha-may") || slug.includes("cong-nghiep")) {
    return [
      { href: "/cung-cap-thuc-pham-dong-nai", label: "Cung cấp thực phẩm Đồng Nai", description: "Trang địa phương cho nhu cầu nhà máy và bếp ăn." },
      { href: "/cung-cap-thuc-pham-binh-duong", label: "Cung cấp thực phẩm Bình Dương", description: "Trang lân cận cho tuyến giao và báo giá." },
      ...common,
    ];
  }

  return [
    { href: "/cung-cap-thuc-pham-bien-hoa", label: "Cung cấp thực phẩm Biên Hòa", description: "Trang địa phương cho nhu cầu mua định kỳ." },
    { href: "/cung-cap-thuc-pham-tp-hcm", label: "Cung cấp thực phẩm TP.HCM", description: "Trang địa phương cho nhu cầu giao theo tuyến." },
    ...common,
  ];
}
