import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { deleteNewsArticle, newsArticleInputSchema, readNewsArticle, upsertNewsArticle } from "@/lib/news";

const adminToken = process.env.ADMIN_TOKEN?.trim() || "tps1-admin";

function isAdminAuthorized(req: Request) {
  return req.headers.get("x-admin-token") === adminToken;
}

export async function GET(_: Request, context: { params: { slug: string } | Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const article = await readNewsArticle(slug);
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
  const parsed = newsArticleInputSchema.safeParse({ ...body, slug });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  const article = await upsertNewsArticle(parsed.data);
  revalidatePath("/tin-tuc");
  revalidatePath(`/tin-tuc/${article.slug}`);

  return NextResponse.json({ ok: true, article });
}

export async function DELETE(req: Request, context: { params: { slug: string } | Promise<{ slug: string }> }) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  const deleted = await deleteNewsArticle(slug);
  revalidatePath("/tin-tuc");
  revalidatePath(`/tin-tuc/${slug}`);

  return NextResponse.json({ ok: deleted });
}
