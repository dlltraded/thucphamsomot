import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import {
  listInternalNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/notification-service";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, 401);
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const actorId = auth.profile?.id !== "legacy-admin" ? auth.profile?.id : null;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    const result = await listInternalNotifications(supabase, {
      userId: actorId,
      limit,
    });

    return json({
      ok: true,
      data: result.notifications,
      unread_count: result.unread_count,
    });
  } catch (error: any) {
    console.error("GET /api/admin/notifications error:", error);
    return json({ ok: false, error: error.message || "Lỗi tải thông báo" }, 500);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, 401);
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const actorId = auth.profile?.id !== "legacy-admin" ? auth.profile?.id : null;
    const body = await req.json().catch(() => ({}));
    const { notificationId, markAll } = body;

    if (markAll) {
      await markAllNotificationsAsRead(supabase, actorId);
      return json({ ok: true, message: "Đã đánh dấu đã đọc tất cả thông báo" });
    }

    if (notificationId) {
      await markNotificationAsRead(supabase, notificationId, actorId);
      return json({ ok: true, message: "Đã đánh dấu đã đọc" });
    }

    return json({ ok: false, error: "Thiếu notificationId hoặc markAll" }, 400);
  } catch (error: any) {
    console.error("PATCH /api/admin/notifications error:", error);
    return json({ ok: false, error: error.message || "Lỗi cập nhật thông báo" }, 500);
  }
}
