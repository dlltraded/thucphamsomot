import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/admin-session";

export async function POST(req: Request) {
  await clearAdminSession();
  const url = new URL("/sale/dang-nhap", req.url);
  return NextResponse.redirect(url, { status: 303 });
}
