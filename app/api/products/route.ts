import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { readManagedProducts, replaceProductsFromCsv, upsertManagedProduct } from "@/lib/products";

const adminToken = process.env.ADMIN_TOKEN?.trim() || "tps1-admin";

function isAdminAuthorized(req: Request) {
  return req.headers.get("x-admin-token") === adminToken;
}

export async function GET() {
  const products = await readManagedProducts();
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { csv?: string } | null;
  const csv = body?.csv?.trim();
  if (!csv) {
    return NextResponse.json({ ok: false, error: "CSV empty" }, { status: 400 });
  }

  const result = await replaceProductsFromCsv(csv);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  revalidatePath("/san-pham");
  revalidatePath("/bao-gia");
  revalidatePath("/portal");
  for (const item of result.products) {
    revalidatePath(`/san-pham/${item.slug}`);
  }

  return NextResponse.json({ ok: true, products: result.products });
}

export async function PUT(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { slug?: string; title?: string; summary?: string; features?: string[]; image?: string }
    | null;

  if (!body?.slug || !body?.title) {
    return NextResponse.json({ ok: false, error: "Missing slug/title" }, { status: 400 });
  }

  const result = await upsertManagedProduct({
    slug: body.slug.trim(),
    title: body.title.trim(),
    summary: body.summary?.trim() || "",
    features: Array.isArray(body.features) ? body.features : [],
    image: body.image?.trim() || undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  revalidatePath("/san-pham");
  revalidatePath("/bao-gia");
  revalidatePath("/portal");
  revalidatePath(`/san-pham/${body.slug.trim()}`);

  return NextResponse.json({ ok: true, products: result.products });
}
