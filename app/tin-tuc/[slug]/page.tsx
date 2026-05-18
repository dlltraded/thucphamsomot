import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, Tag } from "lucide-react";
import { makeMetadata } from "@/lib/seo";
import { formatNewsDate, readNewsArticle, splitNewsContent } from "@/lib/news";

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
            <Image src={article.coverImage} alt={article.title} fill className="news-detail__image" />
          </div>
        </div>
      </section>

      <section className="container-shell news-detail__body">
        {splitNewsContent(article.content).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>
    </main>
  );
}
