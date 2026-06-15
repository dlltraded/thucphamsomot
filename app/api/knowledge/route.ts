import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { knowledgeArticleInputSchema, readKnowledgeArticles, upsertKnowledgeArticle } from "@/lib/knowledge";

const adminToken = process.env.ADMIN_TOKEN?.trim() || "88888888";

function isAdminAuthorized(req: Request) {
  return req.headers.get("x-admin-token") === adminToken;
}

export async function GET() {
  const articles = await readKnowledgeArticles();
  return NextResponse.json({ articles });
}

export async function POST(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = knowledgeArticleInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  const article = await upsertKnowledgeArticle(parsed.data);
  revalidatePath("/kien-thuc");
  revalidatePath(`/kien-thuc/${article.slug}`);

  return NextResponse.json({ ok: true, article });
}

