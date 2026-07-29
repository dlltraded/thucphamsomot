import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, Sparkles } from "lucide-react";
import { makeMetadata } from "@/lib/seo";
import { getAllBlogPosts, formatBlogDate } from "@/lib/blog";

export const dynamic = "force-dynamic";

export const metadata = makeMetadata({
  title: "Blog - Tin tức & Hướng dẫn",
  description: "Các bài viết hướng dẫn về thực phẩm, quản lý bếp ăn, suất ăn công nghiệp và cập nhật tin tức thị trường B2B.",
  path: "/blog",
});

export default async function BlogPage() {
  const articles = await getAllBlogPosts();
  const featured = articles[0];
  const recentPosts = articles.slice(1, 4);
  const list = articles.slice(4);

  return (
    <main className="min-h-screen bg-neutral-50 pb-20">
      {/* Page Header */}
      <div className="bg-white border-b border-neutral-200 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium text-brand-700 bg-brand-50 mb-6 border border-brand-200">
            Blog & Hữu ích
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 tracking-tight mb-6">
            Góc chia sẻ cho bếp ăn, nhà máy <br className="hidden md:block" /> và đội đặt hàng.
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-neutral-600 mb-8">
            Cập nhật tin tức thị trường, mẹo quản lý hao hụt thực phẩm và các bài hướng dẫn giúp tối ưu ngân sách suất ăn công nghiệp hiệu quả.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/bao-gia"
              className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm"
            >
              Nhận Báo Giá <ArrowRight size={18} className="ml-2" />
            </Link>
            <Link
              href="/san-pham"
              className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 transition-colors shadow-sm"
            >
              Xem Sản Phẩm
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        {/* Magazine Layout: Featured Left, 3 Recent Right */}
        {featured && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
            {/* Featured Post (Left, spans 8 cols) */}
            <div className="lg:col-span-8 group">
              <Link href={`/blog/${featured.slug}`} className="block relative h-full min-h-[400px] lg:min-h-[500px] rounded-2xl overflow-hidden shadow-md">
                <Image
                  src={featured.coverImage}
                  alt={featured.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-w-width: 1024px) 100vw, 66vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-8 w-full">
                  <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-white/90">
                    <span className="inline-flex items-center rounded-md bg-brand-500/90 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm shadow-sm">
                      <Sparkles size={12} className="mr-1.5" /> Nổi bật
                    </span>
                    <span className="flex items-center">
                      <CalendarDays size={14} className="mr-1.5 opacity-70" /> {formatBlogDate(featured.publishedAt)}
                    </span>
                    <span className="flex items-center">
                      <Clock3 size={14} className="mr-1.5 opacity-70" /> {featured.readingTime}
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-3 leading-tight group-hover:text-brand-300 transition-colors">
                    {featured.title}
                  </h2>
                  <p className="text-white/80 line-clamp-2 max-w-3xl">
                    {featured.excerpt}
                  </p>
                </div>
              </Link>
            </div>

            {/* Recent Posts (Right, spans 4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <h3 className="text-lg font-semibold text-neutral-900 border-b border-neutral-200 pb-3">Bài Mới Nhất</h3>
              <div className="flex flex-col gap-6 flex-grow justify-between">
                {recentPosts.map((post) => (
                  <Link href={`/blog/${post.slug}`} key={post.slug} className="group flex gap-4 h-full items-center">
                    <div className="relative w-28 h-28 shrink-0 rounded-xl overflow-hidden shadow-sm">
                      <Image
                        src={post.coverImage}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="112px"
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="text-xs font-medium text-brand-600 mb-1">{post.category}</span>
                      <h4 className="text-base font-bold text-neutral-900 leading-snug line-clamp-3 group-hover:text-brand-600 transition-colors">
                        {post.title}
                      </h4>
                      <span className="text-xs text-neutral-500 mt-2 flex items-center">
                        <CalendarDays size={12} className="mr-1 opacity-70" />
                        {formatBlogDate(post.publishedAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3-Column Grid for the rest */}
        {list.length > 0 && (
          <div className="mt-16 border-t border-neutral-200 pt-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-neutral-900">Khám Phá Thêm</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {list.map((article) => (
                <article key={article.slug} className="group bg-white rounded-2xl overflow-hidden border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                  <Link href={`/blog/${article.slug}`} className="block relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={article.coverImage}
                      alt={article.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-w-width: 768px) 100vw, (max-w-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="inline-flex items-center rounded-md bg-white/90 px-2.5 py-1 text-xs font-semibold text-brand-700 shadow-sm backdrop-blur-sm">
                        {article.category}
                      </span>
                    </div>
                  </Link>
                  <div className="p-6">
                    <div className="flex items-center gap-4 text-xs text-neutral-500 mb-3">
                      <span className="flex items-center">
                        <CalendarDays size={14} className="mr-1.5 opacity-70" /> {formatBlogDate(article.publishedAt)}
                      </span>
                      <span className="flex items-center">
                        <Clock3 size={14} className="mr-1.5 opacity-70" /> {article.readingTime}
                      </span>
                    </div>
                    <Link href={`/blog/${article.slug}`} className="block mt-2">
                      <h3 className="text-xl font-bold text-neutral-900 leading-tight group-hover:text-brand-600 transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="mt-3 text-sm text-neutral-600 line-clamp-3">
                        {article.excerpt}
                      </p>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
