import { NextResponse } from "next/server";
import { leadSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = leadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  return NextResponse.json({ ok: true, mode: "contact" });
}
