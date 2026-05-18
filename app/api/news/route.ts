import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { newsArticleInputSchema, readNewsArticles, upsertNewsArticle } from "@/lib/news";

const adminToken = process.env.ADMIN_TOKEN?.trim() || "tps1-admin";

function isAdminAuthorized(req: Request) {
  return req.headers.get("x-admin-token") === adminToken;
}

export async function GET() {
  const articles = await readNewsArticles();
  return NextResponse.json({ articles });
}

export async function POST(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = newsArticleInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  const article = await upsertNewsArticle(parsed.data);
  revalidatePath("/tin-tuc");
  revalidatePath(`/tin-tuc/${article.slug}`);

  return NextResponse.json({ ok: true, article });
}
