import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Leaf,
  NotebookPen,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { makeMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { readKnowledgeArticles } from "@/lib/knowledge";

export const metadata = makeMetadata({
  title: "Kiến thức | Chọn hàng, lên menu và vận hành bếp B2B",
  description:
    "Bộ nội dung giúp khách hàng B2B tìm nhanh cách chọn nguồn hàng, lên menu, kiểm soát chất lượng và tối ưu vận hành bếp ăn tập thể.",
  path: "/kien-thuc",
});

const knowledgePillars = [
  {
    icon: Search,
    title: "Tìm đúng nhu cầu",
    text: "Nội dung được sắp theo câu hỏi thực tế của người mua: chọn hàng, so sánh, kiểm tra và ra quyết định.",
    gradient: "linear-gradient(135deg, rgba(247, 115, 22, 0.18), rgba(250, 204, 21, 0.28))",
  },
  {
    icon: ShieldCheck,
    title: "Ưu tiên niềm tin",
    text: "Tập trung vào an toàn, quy trình, lịch giao và chất lượng thay vì chỉ liệt kê sản phẩm khô cứng.",
    gradient: "linear-gradient(135deg, rgba(15, 111, 75, 0.16), rgba(59, 130, 246, 0.18))",
  },
  {
    icon: NotebookPen,
    title: "Dẫn tới hành động",
    text: "Mỗi bài viết đều có mục tiêu rõ: giúp người đọc chuẩn bị thông tin để đặt mua hoặc xin báo giá.",
    gradient: "linear-gradient(135deg, rgba(199, 55, 47, 0.16), rgba(168, 85, 247, 0.16))",
  },
];

const heroImage =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80";
const featuredImage =
  "https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&w=1100&q=80";

export default async function KnowledgePage() {
  const articles = await readKnowledgeArticles();
  const featuredPost = articles[0];
  const secondaryPosts = articles.slice(1, 4);
  const heroStats = [
    { value: `${articles.length}+`, label: "Chủ đề đang có" },
    { value: "3", label: "Nhóm nội dung chính" },
    { value: "B2B", label: "Tập trung bếp mua định kỳ" },
  ];

  return (
    <main className="knowledge-page">
      <section className="container-shell knowledge-hero">
        <div className="knowledge-hero__copy">
          <div className="eyebrow">Kiến thức</div>
          <h1 className="knowledge-hero__title">Kiến thức chọn nguồn hàng cho bếp ăn và suất ăn công nghiệp.</h1>
          <p className="knowledge-hero__lead">
            Tổng hợp các hướng dẫn giúp người phụ trách bếp chọn nhà cung cấp, lên menu, kiểm tra chất lượng và chuẩn
            bị thông tin trước khi xin báo giá.
          </p>
          <div className="hero-actions">
            <Link href="/bao-gia" className="btn-primary">
              Nhận báo giá <ArrowRight size={18} />
            </Link>
              <Link href={featuredPost ? `/kien-thuc/${featuredPost.slug}` : "/bao-gia"} className="btn-secondary">
                Đọc bài nổi bật <BookOpenText size={18} />
              </Link>
          </div>

          <div className="knowledge-strip" aria-label="Chủ đề nổi bật">
            {["Menu", "Nguồn hàng", "An toàn thực phẩm", "Báo giá B2B"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          <div className="knowledge-stats" aria-label="Thông tin danh mục">
            {heroStats.map((item) => (
              <div key={item.label} className="knowledge-stat">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="knowledge-hero__visual">
          <div className="knowledge-hero__image-frame">
            <Image
              src={heroImage}
              alt="Không gian bếp và món ăn minh hoạ cho trang kiến thức"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 48vw"
              className="knowledge-hero__image"
            />
            <div className="knowledge-hero__image-overlay" />
            <div className="knowledge-hero__image-copy">
              <div className="knowledge-badge">
                <Sparkles size={16} />
                Kiến thức thực tế
              </div>
              <p>Nội dung viết cho người đang cần ra quyết định mua hàng, không phải chỉ đọc cho biết.</p>
            </div>
          </div>

          <div className="knowledge-visual-grid">
            <div className="knowledge-visual-card knowledge-visual-card--gradient">
              <CalendarDays size={18} />
              <strong>Đọc theo nhịp mua hàng</strong>
              <span>Theo mùa, theo menu, theo bài toán vận hành của bếp.</span>
            </div>
            <div className="knowledge-visual-card knowledge-visual-card--image">
              <Image
                src={featuredImage}
                alt="Không gian bếp và bàn ăn minh hoạ"
                fill
                sizes="(max-width: 768px) 100vw, 24vw"
                className="knowledge-visual-card__image"
              />
              <div className="knowledge-visual-card__shade" />
              <div className="knowledge-visual-card__copy">
                <Leaf size={16} />
                <span>Gợi ý nhanh cho bếp cần chuẩn bị danh mục mua hàng.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell section-pad">
        <div className="section-split">
          <div>
            <div className="eyebrow">Cách đọc trang</div>
            <h2 className="knowledge-section-title">Ba nhóm câu hỏi thường gặp khi chuẩn bị mua hàng.</h2>
            <p className="subcopy">
              Khách B2B thường cần biết nên mua gì, kiểm tra chất lượng ra sao và cần gửi thông tin nào để được báo giá
              nhanh.
            </p>
          </div>
        </div>

        <div className="knowledge-pillar-grid">
          {knowledgePillars.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="knowledge-pillar-card" style={{ background: item.gradient }}>
                <Icon size={22} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="container-shell section-pad">
        <div className="section-split">
          <div>
            <div className="eyebrow">Bài nổi bật</div>
            <h2 className="knowledge-section-title">Bài mở đầu trước khi lập danh mục mua hàng.</h2>
          </div>
          <Link href={featuredPost ? `/kien-thuc/${featuredPost.slug}` : "/bao-gia"} className="text-link">
            Mở bài nổi bật <ArrowRight size={16} />
          </Link>
        </div>

        <div className="knowledge-feature-grid">
          <Link href={featuredPost ? `/kien-thuc/${featuredPost.slug}` : "/bao-gia"} className="knowledge-feature-card">
            <div className="knowledge-feature-card__media">
              <Image
                src={featuredImage}
                alt={featuredPost?.title ?? "Bài kiến thức nổi bật"}
                fill
                sizes="(max-width: 768px) 100vw, 58vw"
                className="knowledge-feature-card__image"
              />
            </div>
            <div className="knowledge-feature-card__body">
              <div className="pill">Nổi bật</div>
              <h3>{featuredPost?.title ?? "Đang cập nhật bài kiến thức mới"}</h3>
              <p>{featuredPost?.description ?? "Nội dung kiến thức sẽ hiển thị sau khi có bài viết."}</p>
              <div className="knowledge-feature-card__meta">
                <span>Góc nhìn vận hành bếp</span>
                <ArrowRight size={16} />
              </div>
            </div>
          </Link>

          <div className="knowledge-side-list">
            {secondaryPosts.map((post, index) => (
              <Link
                key={post.slug}
                href={`/kien-thuc/${post.slug}`}
                className={`knowledge-side-card knowledge-side-card--${index + 1}`}
              >
                <div className="knowledge-side-card__index">0{index + 2}</div>
                <h3>{post.title}</h3>
                <p>{post.description}</p>
                <div className="knowledge-side-card__meta">
                  <span>Đọc trong vài phút</span>
                  <ArrowRight size={16} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-shell section-pad">
        <div className="section-split">
          <div>
            <div className="eyebrow">Toàn bộ bài viết</div>
            <h2 className="knowledge-section-title">Tất cả hướng dẫn đang có cho bếp mua định kỳ.</h2>
          </div>
          <Link href="/lien-he" className="text-link">
            Hỏi thêm đội ngũ <ArrowRight size={16} />
          </Link>
        </div>

        <div className="knowledge-post-grid">
          {articles.map((post, index) => (
            <Link
              key={post.slug}
              href={`/kien-thuc/${post.slug}`}
              className={`knowledge-post-card knowledge-post-card--${(index % 4) + 1}`}
            >
              <div className="knowledge-post-card__index">0{index + 1}</div>
              <h3>{post.title}</h3>
              <p>{post.description}</p>
              <div className="knowledge-post-card__footer">
                <span>{index === 0 ? "Bài nền tảng" : "Bài hướng dẫn"}</span>
                <ArrowRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-shell section-pad knowledge-cta">
        <div className="knowledge-cta__card">
          <div>
            <div className="eyebrow eyebrow-on-dark">Cần tư vấn danh mục?</div>
            <h2>Gửi nhu cầu để được gợi ý nhóm hàng, quy cách giao và thông tin báo giá phù hợp.</h2>
            <p>
              Gửi yêu cầu qua {siteConfig.email} hoặc đi tiếp sang trang báo giá để đội ngũ chốt đúng thông tin cho
              bếp ăn, nhà hàng hoặc suất ăn công nghiệp.
            </p>
          </div>
          <Link href="/bao-gia" className="btn-primary btn-on-dark">
            Gửi yêu cầu <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
