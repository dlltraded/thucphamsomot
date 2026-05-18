import { makeMetadata } from "@/lib/seo";
import { PageShell } from "@/components/page-shell";
import { AdminWorkspace } from "@/components/admin-workspace";
import { readNewsArticles } from "@/lib/news";
import { readManagedProducts } from "@/lib/products";
import { readKnowledgeArticles } from "@/lib/knowledge";

export const dynamic = "force-dynamic";

export const metadata = makeMetadata({
  title: "Quản trị nội dung",
  description: "Trang quản trị để đăng và chỉnh sửa tin tức, kiến thức và nội dung hữu ích cho website TPS1.",
  path: "/quan-tri",
});

export default async function AdminPage() {
  const [initialArticles, initialProducts, initialKnowledge] = await Promise.all([
    readNewsArticles(),
    readManagedProducts(),
    readKnowledgeArticles(),
  ]);

  return (
    <PageShell
      eyebrow="Quản trị"
      title="Quản trị nội dung"
      description="Trang nội bộ để anh đăng bài viết, chỉnh sửa nội dung và quản lý tin tức, kiến thức trên website."
    >
      <AdminWorkspace initialArticles={initialArticles} initialProducts={initialProducts} initialKnowledge={initialKnowledge} />
    </PageShell>
  );
}
