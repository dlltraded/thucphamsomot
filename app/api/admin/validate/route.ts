import { NextResponse } from "next/server";

const adminToken = process.env.ADMIN_TOKEN?.trim() || "88888888";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const token = body?.token;

    if (!token) {
      return NextResponse.json({ ok: false, error: "Mật khẩu là bắt buộc" }, { status: 400 });
    }

    if (token === adminToken) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Mật khẩu chưa đúng" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Lỗi hệ thống" }, { status: 500 });
  }
}
