import { NextResponse } from "next/server";
import { leadSchema } from "@/lib/validation";
import { siteConfig } from "@/lib/site";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = leadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing GOOGLE_SHEET_WEBHOOK_URL",
        hint: "Configure a Google Apps Script web app URL in Vercel project settings or .env.local for local dev.",
      },
      { status: 500 },
    );
  }

  const payload = {
    ...parsed.data,
    site: siteConfig.domain,
    source: "thucphamso1.vn/bao-gia",
    submittedAt: new Date().toISOString(),
    selectedCount: parsed.data.selectedItems?.length ?? 0,
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to forward lead to Google Sheet webhook",
        details: text.slice(0, 200),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, routed: true, selectedCount: payload.selectedCount });
}
