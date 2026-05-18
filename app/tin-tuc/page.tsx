import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, Sparkles } from "lucide-react";
import { makeMetadata } from "@/lib/seo";
import { readNewsArticles, formatNewsDate } from "@/lib/news";

export const dynamic = "force-dynamic";

export const metadata = makeMetadata({
  title: "Tin tức",
  description: "Các bài viết hữu ích về thực phẩm, bếp ăn, suất ăn công nghiệp và kinh nghiệm đặt hàng B2B.",
  path: "/tin-tuc",
});

export default async function NewsPage() {
  const articles = await readNewsArticles();
  const featured = articles[0];
  const list = articles.slice(1);

  return (
    <main className="news-page">
      <section className="news-hero">
        <div className="container-shell news-hero__grid">
          <div className="news-hero__copy">
            <div className="eyebrow eyebrow-on-dark">Tin tức & hữu ích</div>
            <h1>Góc chia sẻ cho bếp ăn, nhà máy và đội đặt hàng.</h1>
            <p>
              TPS1 đăng những bài ngắn, rõ và dễ áp dụng để khách hàng chọn hàng nhanh hơn, đặt hàng chuẩn hơn và vận
              hành bếp ổn định hơn.
            </p>
            <div className="news-hero__actions">
              <Link href="/bao-gia" className="btn-primary btn-on-dark">
                Gửi yêu cầu báo giá <ArrowRight size={18} />
              </Link>
              <Link href="/san-pham" className="btn-secondary btn-on-dark-secondary">
                Xem catalog <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          {featured ? (
            <article className="news-featured">
              <div className="news-featured__image">
                <Image src={featured.coverImage} alt={featured.title} fill className="news-featured__img" />
              </div>
              <div className="news-featured__body">
                <div className="news-meta">
                  <span>
                    <Sparkles size={14} />
                    Nổi bật
                  </span>
                  <span>
                    <CalendarDays size={14} />
                    {formatNewsDate(featured.publishedAt)}
                  </span>
                  <span>
                    <Clock3 size={14} />
                    {featured.readingTime}
                  </span>
                </div>
                <div className="pill">{featured.category}</div>
                <h2>{featured.title}</h2>
                <p>{featured.excerpt}</p>
                <Link href={`/tin-tuc/${featured.slug}`} className="text-link">
                  Đọc bài viết <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          ) : null}
        </div>
      </section>

      <section className="container-shell news-list">
        <div className="section-split">
          <div className="section-heading">
            <div className="eyebrow">Bài mới nhất</div>
            <h2 className="section-heading__title">Nội dung ngắn gọn, dễ đọc, dễ dùng cho khách hàng B2B.</h2>
          </div>
          <Link href="/bao-gia" className="text-link">
            Mở form báo giá <ArrowRight size={16} />
          </Link>
        </div>

        <div className="news-grid">
          {list.map((article) => (
            <article key={article.slug} className="news-card">
              <div className="news-card__image">
                <Image src={article.coverImage} alt={article.title} fill className="news-card__img" />
              </div>
              <div className="news-card__body">
                <div className="news-meta">
                  <span>{article.category}</span>
                  <span>{formatNewsDate(article.publishedAt)}</span>
                  <span>{article.readingTime}</span>
                </div>
                <h3>{article.title}</h3>
                <p>{article.excerpt}</p>
                <Link href={`/tin-tuc/${article.slug}`} className="text-link">
                  Xem chi tiết <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
