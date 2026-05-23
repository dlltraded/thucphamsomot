import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { deleteSupabaseItem, isSupabaseContentEnabled, readSupabaseItems, saveSupabaseItems } from "@/lib/supabase-content-store";

const newsArticleSchema = z.object({
  slug: z.string().min(1).optional(),
  title: z.string().min(3),
  excerpt: z.string().min(20),
  category: z.string().min(2),
  author: z.string().min(2),
  publishedAt: z.string().min(1),
  readingTime: z.string().min(1),
  coverImage: z.string().min(1),
  content: z.string().min(20),
  featured: z.boolean().optional(),
});

export type NewsArticle = z.infer<typeof newsArticleSchema> & {
  slug: string;
};

export const newsArticleInputSchema = newsArticleSchema;

const newsFile = path.join(process.cwd(), "data", "news.json");

const defaultArticles: NewsArticle[] = [
  {
    slug: "cach-chon-thuc-pham-cho-bep-an-tap-the",
    title: "Cách chọn thực phẩm cho bếp ăn tập thể để giảm hao hụt",
    excerpt:
      "Một danh mục thực phẩm rõ ràng giúp bếp ăn ổn định chất lượng, giảm thất thoát và dễ chốt phương án mua hàng hơn.",
    category: "Vận hành bếp ăn",
    author: "TPS1",
    publishedAt: "2026-05-18T08:00:00.000Z",
    readingTime: "4 phút",
    coverImage: "/images/tps1-warehouse-wide.jpg",
    featured: true,
    content:
      "Bếp ăn tập thể không cần danh mục quá dài, nhưng cần đủ rõ để người phụ trách dễ chọn, dễ đối chiếu và dễ đặt lại.\n\n" +
      "Nguyên tắc nên ưu tiên là nhóm hàng ổn định, quy cách rõ, thời gian giao đều và có phương án thay thế khi mùa vụ thay đổi.\n\n" +
      "Khi catalog được trình bày theo nhóm sản phẩm và có nút yêu cầu báo giá riêng, khách thường ra quyết định nhanh hơn vì không phải xử lý quá nhiều bước thừa.",
  },
  {
    slug: "5-luu-y-khi-dat-hang-thuc-pham-cho-nha-may",
    title: "5 lưu ý khi đặt hàng thực phẩm cho nhà máy",
    excerpt:
      "Đơn hàng nhà máy thường cần đúng giờ, đúng khối lượng và đúng quy cách. Chỉ cần lệch một khâu là cả ca vận hành bị ảnh hưởng.",
    category: "Nhà máy",
    author: "TPS1",
    publishedAt: "2026-05-17T08:00:00.000Z",
    readingTime: "5 phút",
    coverImage: "/images/tps1-delivery-truck.jpg",
    content:
      "Nhà máy thường vận hành theo lịch cố định nên đơn thực phẩm cần đi kèm quy trình rõ ràng.\n\n" +
      "Thứ nhất là danh mục hàng đã thống nhất trước. Thứ hai là số lượng dự kiến theo ca hoặc theo tuần. Thứ ba là khu vực giao và khung giờ nhận hàng.\n\n" +
      "Khi những dữ liệu này được nhập ngay trên website, đội kinh doanh có thể báo giá nhanh hơn và giảm việc gọi đi gọi lại nhiều lần.",
  },
  {
    slug: "checklist-gui-yeu-cau-bao-gia-nhanh",
    title: "Checklist gửi yêu cầu báo giá nhanh cho căn tin và suất ăn công nghiệp",
    excerpt:
      "Chỉ cần chuẩn bị đúng 6 thông tin cơ bản, yêu cầu báo giá sẽ rõ hơn và đội kinh doanh phản hồi nhanh hơn.",
    category: "Báo giá",
    author: "TPS1",
    publishedAt: "2026-05-16T08:00:00.000Z",
    readingTime: "3 phút",
    coverImage: "/images/tps1-quality.jpg",
    content:
      "Nếu khách muốn nhận báo giá nhanh, phần quan trọng nhất không phải là viết dài, mà là viết đúng.\n\n" +
      "Hãy chuẩn bị: tên đơn vị, nhóm hàng cần mua, số lượng dự kiến, khu vực giao, thời gian cần hàng và ghi chú quy cách.\n\n" +
      "Một form báo giá tốt sẽ gom đủ các thông tin này để đội kinh doanh có thể chốt phương án ngay từ lần đầu.",
  },
];

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeArticle(raw: z.infer<typeof newsArticleSchema>): NewsArticle {
  return {
    ...raw,
    slug: raw.slug?.trim() || slugify(raw.title),
    featured: raw.featured ?? false,
  };
}

function sortArticles(articles: NewsArticle[]) {
  return [...articles].sort((left, right) => {
    if (left.featured !== right.featured) {
      return left.featured ? -1 : 1;
    }
    return new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
  });
}

async function readJsonFile() {
  const raw = await fs.readFile(newsFile, "utf8");
  const parsed = JSON.parse(raw) as { articles?: unknown } | unknown;
  const articles = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { articles?: unknown }).articles)
      ? (parsed as { articles: unknown[] }).articles
      : [];
  return articles;
}

export async function readNewsArticles(): Promise<NewsArticle[]> {
  if (isSupabaseContentEnabled()) {
    try {
      const rows = await readSupabaseItems<NewsArticle>("news");
      const parsed = z.array(newsArticleSchema).safeParse(rows ?? []);
      if (parsed.success && parsed.data.length) {
        return sortArticles(parsed.data.map(normalizeArticle));
      }
    } catch (error) {
      console.error("Failed to read news from Supabase. Falling back to JSON/defaults.", error);
    }
  }

  try {
    const rawArticles = await readJsonFile();
    const parsed = z.array(newsArticleSchema).safeParse(rawArticles);
    if (parsed.success) {
      return sortArticles(parsed.data.map(normalizeArticle));
    }
  } catch {
    // Fallback below.
  }

  return sortArticles(defaultArticles.map(normalizeArticle));
}

export async function readNewsArticle(slug: string): Promise<NewsArticle | null> {
  const articles = await readNewsArticles();
  return articles.find((article) => article.slug === slug) ?? null;
}

export async function saveNewsArticles(articles: NewsArticle[]) {
  if (isSupabaseContentEnabled()) {
    const sorted = sortArticles(articles);
    await saveSupabaseItems("news", sorted, {
      getSlug: (item) => item.slug,
      getTitle: (item) => item.title,
      getPublishedAt: (item) => item.publishedAt,
      getFeatured: (item) => item.featured,
    });
    return;
  }

  await fs.mkdir(path.dirname(newsFile), { recursive: true });
  await fs.writeFile(newsFile, JSON.stringify({ articles: sortArticles(articles) }, null, 2), "utf8");
}

export async function upsertNewsArticle(input: z.infer<typeof newsArticleSchema>) {
  const article = normalizeArticle(input);
  const articles = await readNewsArticles();
  const index = articles.findIndex((item) => item.slug === article.slug);
  const next = index >= 0 ? articles.map((item) => (item.slug === article.slug ? article : item)) : [article, ...articles];
  await saveNewsArticles(next);
  return article;
}

export async function deleteNewsArticle(slug: string) {
  if (isSupabaseContentEnabled()) {
    return deleteSupabaseItem("news", slug);
  }

  const articles = await readNewsArticles();
  const next = articles.filter((article) => article.slug !== slug);
  await saveNewsArticles(next);
  return next.length !== articles.length;
}

export function formatNewsDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function splitNewsContent(content: string) {
  return content
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

export { defaultArticles };
