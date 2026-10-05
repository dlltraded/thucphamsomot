import { NextRequest, NextResponse } from "next/server";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { processPickingRetryQueue } from "@/lib/picking-retry-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function run(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processPickingRetryQueue(getCustomerSupabaseAdmin(), 20);
    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("Picking retry worker failed:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Không thể xử lý hàng đợi lệnh soạn" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
