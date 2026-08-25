import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  return NextResponse.json({ 
    ok: true, 
    role: auth.profile?.role || 'sale',
    name: auth.profile?.name || 'Unknown'
  });
}
