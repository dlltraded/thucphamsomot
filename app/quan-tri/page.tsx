import { makeMetadata } from "@/lib/seo";
import { PageShell } from "@/components/page-shell";
import { NewsAdmin } from "@/components/news-admin";
import { ProductAdmin } from "@/components/product-admin";
import { readNewsArticles } from "@/lib/news";
import { readManagedProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export const metadata = makeMetadata({
  title: "Quản trị nội dung",
  description: "Trang quản trị để đăng và chỉnh sửa tin tức, bài hữu ích cho website TPS1.",
  path: "/quan-tri",
});

export default async function AdminPage() {
  const [initialArticles, initialProducts] = await Promise.all([readNewsArticles(), readManagedProducts()]);

  return (
    <PageShell
      eyebrow="Quản trị"
      title="Quản trị nội dung"
      description="Trang nội bộ để anh đăng bài viết, chỉnh sửa nội dung và quản lý các bài hữu ích trên website."
    >
      <NewsAdmin initialArticles={initialArticles} />
      <ProductAdmin initialProducts={initialProducts} />
    </PageShell>
  );
}
