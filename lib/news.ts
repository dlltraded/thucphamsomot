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
      "Bếp ăn tập thể không cần danh mục quá dài, nhưng cần đủ rõ để người phụ trách dễ chọn, dễ đối chiếu và dễ đặt lại. Nếu danh mục rối, mỗi lần báo giá sẽ kéo theo hàng loạt câu hỏi phụ và làm chậm cả chuỗi vận hành.\n\n" +
      "Nguyên tắc nên ưu tiên là nhóm hàng ổn định, quy cách rõ, thời gian giao đều và có phương án thay thế khi mùa vụ thay đổi. Với bếp mua định kỳ, giá tốt chỉ có ý nghĩa khi chất lượng và lịch giao đủ ổn định để dùng lặp lại nhiều tuần.\n\n" +
      "Một danh mục tốt cũng nên chia theo nhóm sử dụng thực tế: rau củ, đạm động vật, hàng đông lạnh, gia vị và nhóm nguyên liệu đặc thù. Cách chia này giúp người phụ trách nội bộ không phải tìm kiếm lại từ đầu mỗi khi đổi menu.\n\n" +
      "Khi catalog được trình bày theo nhóm sản phẩm, có hình ảnh thật và nút báo giá rõ ràng, khách thường ra quyết định nhanh hơn vì không phải xử lý quá nhiều bước thừa.",
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
      "Nhà máy thường vận hành theo lịch cố định nên đơn thực phẩm cần đi kèm quy trình rõ ràng. Chỉ cần lệch khung giao hoặc thay đổi quy cách nhận hàng, ca sản xuất có thể bị ảnh hưởng ngay.\n\n" +
      "Thứ nhất là danh mục hàng đã thống nhất trước. Thứ hai là số lượng dự kiến theo ca hoặc theo tuần. Thứ ba là khu vực giao và khung giờ nhận hàng. Thứ tư là tiêu chí kiểm hàng để tránh tranh cãi khi nhận. Thứ năm là người chịu trách nhiệm phản hồi khi phát sinh thiếu hàng hoặc đổi quy cách.\n\n" +
      "Nhà máy cũng nên chuẩn bị sẵn phương án thay thế cho những mặt hàng có tính biến động cao. Ví dụ cùng một nhóm nguyên liệu nhưng có thể chấp nhận nhiều mức quy cách khác nhau nếu menu đã được chốt trước.\n\n" +
      "Khi các thông tin này được nhập ngay trên website, đội kinh doanh có thể báo giá nhanh hơn, giảm việc gọi đi gọi lại nhiều lần và giảm rủi ro chậm lịch giao.",
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
      "Nếu khách muốn nhận báo giá nhanh, phần quan trọng nhất không phải là viết dài, mà là viết đúng. Một form ngắn nhưng đủ ý luôn có giá trị hơn một đoạn mô tả chung chung.\n\n" +
      "Hãy chuẩn bị: tên đơn vị, nhóm hàng cần mua, số lượng dự kiến, khu vực giao, thời gian cần hàng và ghi chú quy cách. Nếu có yêu cầu sơ chế, đóng gói, giao nhiều điểm hoặc giao theo ca, nên ghi ngay từ đầu để tránh hỏi lại.\n\n" +
      "Với khách mua định kỳ, việc ghi rõ lịch giao và mức độ linh hoạt của từng mặt hàng sẽ giúp đội kinh doanh đề xuất phương án sát hơn. Báo giá lúc này không chỉ là một con số, mà là một kế hoạch cung ứng.\n\n" +
      "Một form báo giá tốt sẽ gom đủ các thông tin này để đội kinh doanh có thể chốt phương án ngay từ lần đầu và khách không mất thời gian trao đổi vòng lại.",
  },
  {
    slug: "landing-page-dia-ban-va-intent-mua-hang",
    title: "Khi nào nên tách landing page theo địa bàn và theo intent mua hàng?",
    excerpt:
      "Landing page địa phương chỉ hiệu quả khi mỗi trang gánh một nhu cầu tìm kiếm rõ ràng và có bằng chứng phục vụ thực tế.",
    category: "SEO địa phương",
    author: "TPS1",
    publishedAt: "2026-05-15T08:00:00.000Z",
    readingTime: "4 phút",
    coverImage: "/images/tps1-gallery-factory-visit.jpg",
    content:
      "Landing page theo địa bàn không phải để nhồi thêm từ khóa. Mục tiêu đúng là tạo ra một trang có nội dung sát nhu cầu thực tế của khách ở khu vực đó, từ lịch giao, tuyến đường đến loại đơn hàng thường gặp.\n\n" +
      "Khi mỗi trang gánh một intent riêng, đội bán hàng cũng dễ phản hồi lead hơn vì đã có sẵn ngữ cảnh. Ví dụ một trang cho Đồng Nai có thể nhấn vào bếp ăn tập thể và nhà máy, còn trang TP.HCM có thể nhấn vào tuyến giao, thời gian phản hồi và nhu cầu báo giá nhanh.\n\n" +
      "Điểm cần tránh là làm nhiều trang nhưng nội dung na ná nhau. Google và người dùng đều không thích một bộ trang lặp lại thay địa danh rồi giữ nguyên toàn bộ nội dung.\n\n" +
      "Cách làm tốt hơn là mỗi landing page phải có mô tả khu vực phục vụ, nhóm khách phù hợp, bằng chứng vận hành và một lời kêu gọi hành động rõ ràng. Khi đó trang địa phương mới thực sự có giá trị SEO lẫn chuyển đổi.",
  },
  {
    slug: "cach-doc-bang-bao-gia-thuc-pham-b2b",
    title: "Cách đọc một bảng báo giá thực phẩm B2B mà không bỏ sót chi phí",
    excerpt:
      "Giá tốt chưa chắc là giá cuối. Một bảng báo giá chuẩn phải cho thấy quy cách, lịch giao, điều kiện thanh toán và các ràng buộc vận hành.",
    category: "Báo giá B2B",
    author: "TPS1",
    publishedAt: "2026-05-14T08:00:00.000Z",
    readingTime: "5 phút",
    coverImage: "/images/tps1-gallery-warehouse-people.jpg",
    content:
      "Một bảng báo giá thực phẩm B2B đáng tin cậy không chỉ có đơn giá. Nó cần thể hiện rõ quy cách hàng, đơn vị tính, thời gian giao, điều kiện thanh toán và các yêu cầu phát sinh nếu có.\n\n" +
      "Khách mua định kỳ nên đọc báo giá theo ba lớp. Lớp đầu là giá và quy cách. Lớp hai là lịch giao và mức độ ổn định nguồn hàng. Lớp ba là khả năng phản hồi khi có thay đổi về menu, số lượng hoặc địa điểm nhận.\n\n" +
      "Nếu báo giá thiếu phần quy cách, hai bên rất dễ hiểu khác nhau về cùng một mặt hàng. Nếu thiếu lịch giao, đơn hàng có thể đúng giá nhưng sai nhịp vận hành. Nếu thiếu điều kiện đổi trả, rủi ro sẽ chuyển sang lúc nhận hàng.\n\n" +
      "Bởi vậy, một bảng báo giá tốt không chỉ giúp chốt đơn nhanh hơn mà còn giúp giảm chi phí ẩn trong quá trình vận hành sau đó.",
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
