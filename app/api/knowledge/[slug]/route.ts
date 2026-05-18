import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { deleteKnowledgeArticle, knowledgeArticleInputSchema, readKnowledgeArticle, upsertKnowledgeArticle } from "@/lib/knowledge";

const adminToken = process.env.ADMIN_TOKEN?.trim() || "88888888";

function isAdminAuthorized(req: Request) {
  return req.headers.get("x-admin-token") === adminToken;
}

export async function GET(_: Request, context: { params: { slug: string } | Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const article = await readKnowledgeArticle(slug);
  if (!article) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ article });
}

export async function PUT(req: Request, context: { params: { slug: string } | Promise<{ slug: string }> }) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  const body = await req.json().catch(() => null);
  const parsed = knowledgeArticleInputSchema.safeParse({ ...body, slug });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  const article = await upsertKnowledgeArticle(parsed.data);
  revalidatePath("/kien-thuc");
  revalidatePath(`/kien-thuc/${article.slug}`);

  return NextResponse.json({ ok: true, article });
}

export async function DELETE(req: Request, context: { params: { slug: string } | Promise<{ slug: string }> }) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  const deleted = await deleteKnowledgeArticle(slug);
  revalidatePath("/kien-thuc");
  revalidatePath(`/kien-thuc/${slug}`);

  return NextResponse.json({ ok: deleted });
}

