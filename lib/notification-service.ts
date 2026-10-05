import { SupabaseClient } from "@supabase/supabase-js";

export interface CreateNotificationParams {
  recipientUserId?: string | null;
  departmentId?: string | null;
  eventType: string;
  entityType: string;
  entityId: string;
  title: string;
  body?: string;
  deepLink?: string;
  idempotencyKey?: string;
}

export async function createInternalNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams
) {
  const {
    recipientUserId,
    departmentId,
    eventType,
    entityType,
    entityId,
    title,
    body,
    deepLink,
    idempotencyKey,
  } = params;

  try {
    const payload: any = {
      recipient_user_id: recipientUserId || null,
      department_id: departmentId || null,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      title,
      body: body || null,
      deep_link: deepLink || null,
      idempotency_key: idempotencyKey || null,
      created_at: new Date().toISOString(),
    };

    if (idempotencyKey) {
      const { data, error } = await supabase
        .from("internal_notifications")
        .upsert(payload, { onConflict: "idempotency_key", ignoreDuplicates: true })
        .select()
        .maybeSingle();

      if (error) {
        console.warn("Lỗi khi tạo internal_notification:", error.message);
      }
      return data;
    } else {
      const { data, error } = await supabase
        .from("internal_notifications")
        .insert(payload)
        .select()
        .maybeSingle();

      if (error) {
        console.warn("Lỗi khi tạo internal_notification:", error.message);
      }
      return data;
    }
  } catch (err: any) {
    console.warn("createInternalNotification exception:", err.message);
    return null;
  }
}

export interface ListNotificationOptions {
  userId?: string | null;
  departmentId?: string | null;
  limit?: number;
}

export async function listInternalNotifications(
  supabase: SupabaseClient,
  options: ListNotificationOptions = {}
) {
  const { userId, limit = 30 } = options;

  let query = supabase
    .from("internal_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (userId) {
    // Tra cứu phòng ban và role của user để cô lập dữ liệu
    const { data: profile } = await supabase
      .from("admin_profiles")
      .select("id, role, department_id")
      .eq("id", userId)
      .maybeSingle();

    const isGlobalAdmin = profile?.role === "admin";
    const userDeptId = options.departmentId || profile?.department_id;

    if (!isGlobalAdmin) {
      if (userDeptId) {
        // Chỉ nhận thông báo đích danh hoặc thông báo chung của đúng phòng ban của mình
        query = query.or(`recipient_user_id.eq.${userId},and(recipient_user_id.is.null,department_id.eq.${userDeptId})`);
      } else {
        // Nếu không có phòng ban và không phải admin: chỉ nhận thông báo đích danh
        query = query.eq("recipient_user_id", userId);
      }
    } else if (options.departmentId) {
      query = query.eq("department_id", options.departmentId);
    }
  } else if (options.departmentId) {
    query = query.eq("department_id", options.departmentId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const unreadCount = (data || []).filter((n: any) => !n.read_at).length;

  return {
    notifications: data || [],
    unread_count: unreadCount,
  };
}

export async function markNotificationAsRead(
  supabase: SupabaseClient,
  notificationId: string,
  actorId?: string | null
) {
  const { data: notif, error: fetchErr } = await supabase
    .from("internal_notifications")
    .select("id, recipient_user_id, department_id")
    .eq("id", notificationId)
    .single();

  if (fetchErr || !notif) throw new Error("Không tìm thấy thông báo");

  // Kiểm tra quyền: chỉ đích danh người nhận, thành viên phòng ban nhận tin hoặc admin mới được đánh dấu đã đọc
  if (actorId) {
    const { data: actorProfile } = await supabase
      .from("admin_profiles")
      .select("id, role, department_id")
      .eq("id", actorId)
      .maybeSingle();

    const isGlobalAdmin = actorProfile?.role === "admin";
    const isDirectRecipient = notif.recipient_user_id === actorId;
    const isDeptMember = !notif.recipient_user_id && !!notif.department_id && notif.department_id === actorProfile?.department_id;

    if (!isGlobalAdmin && !isDirectRecipient && !isDeptMember) {
      throw new Error("Không có quyền đánh dấu đã đọc thông báo của người khác hoặc phòng ban khác");
    }
  }

  const { error } = await supabase
    .from("internal_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) throw error;
  return { success: true };
}

export async function markAllNotificationsAsRead(
  supabase: SupabaseClient,
  userId?: string | null
) {
  let query = supabase
    .from("internal_notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (userId) {
    const { data: profile } = await supabase
      .from("admin_profiles")
      .select("id, role, department_id")
      .eq("id", userId)
      .maybeSingle();

    const isGlobalAdmin = profile?.role === "admin";
    const userDeptId = profile?.department_id;

    if (!isGlobalAdmin) {
      if (userDeptId) {
        query = query.or(`recipient_user_id.eq.${userId},and(recipient_user_id.is.null,department_id.eq.${userDeptId})`);
      } else {
        query = query.eq("recipient_user_id", userId);
      }
    }
  }

  const { error } = await query;
  if (error) throw error;
  return { success: true };
}
