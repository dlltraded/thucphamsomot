import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { canForProfile } from "@/lib/permissions";
import {
  listProcurementReviews,
  createProcurementReview,
} from "@/lib/procurement-service";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok || !auth.profile) {
    return json({ ok: false, error: auth.error || "Chưa đăng nhập" }, 401);
  }

  if (!canForProfile(auth.profile, "procurement.review_view")) {
    return json({ ok: false, error: "Không có quyền xem yêu cầu kiểm tra hàng" }, 403);
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const tab = (searchParams.get("tab") as any) || "all";
  const deliveryDate = searchParams.get("deliveryDate") || undefined;
  const assignedTo = searchParams.get("assignedTo") || undefined;
  const search = searchParams.get("search") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  try {
    const result = await listProcurementReviews({
      status,
      tab,
      deliveryDate,
      assignedTo,
      search,
      page,
      limit,
      currentUserId: auth.profile.id,
    });

    return json({ ok: true, ...result });
  } catch (err: any) {
    console.error("Lỗi listProcurementReviews:", err);
    return json({ ok: false, error: err.message || "Lỗi hệ thống khi tải danh sách" }, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok || !auth.profile) {
    return json({ ok: false, error: auth.error || "Chưa đăng nhập" }, 401);
  }

  if (!canForProfile(auth.profile, "procurement.review_request")) {
    return json({ ok: false, error: "Không có quyền gửi yêu cầu Thu mua kiểm tra hàng" }, 403);
  }

  try {
    const body = await req.json();
    const orderId = String(body.orderId || "").trim();
    const note = body.note ? String(body.note).trim() : undefined;

    if (!orderId) {
      return json({ ok: false, error: "Thiếu orderId" }, 400);
    }

    const review = await createProcurementReview(orderId, auth.profile.id, note);
    return json({ ok: true, data: review }, 201);
  } catch (err: any) {
    console.error("Lỗi createProcurementReview:", err);
    return json({ ok: false, error: err.message || "Lỗi hệ thống khi tạo yêu cầu" }, 400);
  }
}
