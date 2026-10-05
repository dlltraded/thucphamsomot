import { SupabaseClient } from "@supabase/supabase-js";
import { createInternalNotification } from "./notification-service";

export interface ListPickingTasksOptions {
  status?: string;
  deliveryDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Danh sách tác vụ soạn hàng — phân trang server-side, tương thích triệt để schema DB.
 */
export async function listPickingTasks(
  supabase: SupabaseClient,
  options: ListPickingTasksOptions = {}
) {
  const { status, deliveryDate, search, page = 1, limit = 50 } = options;

  let query = supabase
    .from("picking_tasks")
    .select(`
      id,
      order_id,
      status,
      assigned_to,
      accepted_at,
      completed_at,
      source_confirmation_version,
      note,
      created_at,
      updated_at,
      order:orders (
        id,
        order_code,
        customer_name,
        customer_phone,
        customer_company,
        delivery_address,
        delivery_date,
        delivery_shift,
        note,
        status,
        packing_status,
        grand_total,
        subtotal
      ),
      assigned_to_profile:assigned_to (
        id,
        name,
        email,
        role
      ),
      items:picking_task_items (
        id,
        picking_task_id,
        order_item_id,
        confirmed_qty,
        picked_qty,
        status,
        exception_reason,
        order_item:order_items (
          id,
          name,
          sku,
          unit,
          quantity,
          unit_price
        )
      ),
      exceptions:picking_exceptions (
        id,
        picking_task_id,
        order_id,
        order_item_id,
        type,
        requested_change,
        reason,
        status,
        reported_by,
        created_at
      )
    `, { count: "exact" })
    .neq("status", "superseded")
    .order("created_at", { ascending: false });

  if (status) {
    if (status === "released") {
      query = query.eq("status", "released");
    } else if (status === "in_progress") {
      query = query.in("status", ["accepted", "picking"]);
    } else if (status === "exception") {
      query = query.eq("status", "exception");
    } else if (status === "done" || status === "completed") {
      query = query.eq("status", "completed");
    } else if (status !== "all") {
      query = query.eq("status", status);
    }
  }

  if (deliveryDate) {
    query = query.eq("order.delivery_date", deliveryDate);
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  const today = new Date().toISOString().slice(0, 10);

  let tasks = (data || []).map((t: any) => {
    const taskDate = t.order?.delivery_date;
    const isOverdue = !!(taskDate && taskDate < today && t.status !== "completed" && t.status !== "canceled");
    const openExceptionsCount = (t.exceptions || []).filter((e: any) => e.status === "pending" || e.status === "open").length;

    const normalizedProfile = t.assigned_to_profile ? {
      ...t.assigned_to_profile,
      full_name: t.assigned_to_profile.name || '',
    } : null;

    const normalizedItems = (t.items || []).map((it: any) => ({
      id: it.id,
      task_id: it.picking_task_id,
      picking_task_id: it.picking_task_id,
      order_item_id: it.order_item_id,
      confirmed_qty: Number(it.confirmed_qty || 0),
      requested_qty: Number(it.confirmed_qty || 0),
      picked_qty: Number(it.picked_qty || 0),
      unit: it.order_item?.unit || "Kg",
      status: it.status,
      note: it.exception_reason,
      exception_reason: it.exception_reason,
      order_item: it.order_item ? { ...it.order_item, product_name: it.order_item.name } : null,
    }));

    const normalizedExceptions = (t.exceptions || []).map((e: any) => ({
      id: e.id,
      task_id: e.picking_task_id,
      picking_task_id: e.picking_task_id,
      order_id: e.order_id,
      order_item_id: e.order_item_id,
      task_item_id: e.order_item_id,
      exception_type: e.type,
      type: e.type,
      requested_qty: e.requested_change?.requested_qty ?? null,
      actual_qty: e.requested_change?.actual_qty ?? null,
      proposed_product_id: e.requested_change?.proposed_product_id ?? null,
      reason: e.reason,
      status: e.status,
      reported_by: e.reported_by,
      reported_at: e.created_at,
    }));

    return {
      ...t,
      task_number: t.order?.order_code || t.id.slice(0, 8),
      version: t.source_confirmation_version,
      delivery_date: taskDate,
      notes: t.note,
      is_overdue: isOverdue,
      open_exceptions_count: openExceptionsCount,
      assigned_to_profile: normalizedProfile,
      items: normalizedItems,
      exceptions: normalizedExceptions,
    };
  });

  if (search) {
    const s = search.toLowerCase().trim();
    tasks = tasks.filter((t: any) =>
      t.task_number?.toLowerCase().includes(s) ||
      t.order?.order_code?.toLowerCase().includes(s) ||
      t.order?.customer_name?.toLowerCase().includes(s)
    );
  }

  return {
    data: tasks,
    total: count ?? tasks.length,
    page,
    limit,
  };
}

/**
 * Chi tiết tác vụ soạn hàng
 */
export async function getPickingTaskDetail(supabase: SupabaseClient, taskId: string) {
  const { data: task, error } = await supabase
    .from("picking_tasks")
    .select(`
      id,
      order_id,
      status,
      assigned_to,
      accepted_at,
      completed_at,
      source_confirmation_version,
      note,
      created_at,
      updated_at,
      order:orders (
        id,
        order_code,
        customer_name,
        customer_phone,
        customer_company,
        delivery_address,
        delivery_date,
        delivery_shift,
        note,
        status,
        packing_status,
        grand_total,
        subtotal
      ),
      assigned_to_profile:assigned_to (
        id,
        name,
        email,
        role
      ),
      items:picking_task_items (
        id,
        picking_task_id,
        order_item_id,
        confirmed_qty,
        picked_qty,
        status,
        exception_reason,
        order_item:order_items (
          id,
          name,
          sku,
          unit,
          quantity,
          unit_price
        )
      ),
      exceptions:picking_exceptions (
        id,
        picking_task_id,
        order_id,
        order_item_id,
        type,
        requested_change,
        reason,
        status,
        reported_by,
        resolved_by,
        resolved_at,
        created_at,
        reporter:reported_by (id, name, role),
        resolver:resolved_by (id, name, role)
      )
    `)
    .eq("id", taskId)
    .single();

  if (error || !task) throw error || new Error("Không tìm thấy tác vụ soạn hàng");

  const today = new Date().toISOString().slice(0, 10);
  const taskDate = (task.order as any)?.delivery_date;
  const isOverdue = !!(taskDate && taskDate < today && task.status !== "completed" && task.status !== "canceled");

  const normalizedProfile = task.assigned_to_profile ? {
    ...task.assigned_to_profile,
    full_name: (task.assigned_to_profile as any).name || '',
  } : null;

  const normalizedItems = (task.items || []).map((it: any) => ({
    id: it.id,
    task_id: it.picking_task_id,
    picking_task_id: it.picking_task_id,
    order_item_id: it.order_item_id,
    confirmed_qty: Number(it.confirmed_qty || 0),
    requested_qty: Number(it.confirmed_qty || 0),
    picked_qty: Number(it.picked_qty || 0),
    unit: it.order_item?.unit || "Kg",
    status: it.status,
    note: it.exception_reason,
    exception_reason: it.exception_reason,
    order_item: it.order_item ? { ...it.order_item, product_name: it.order_item.name } : null,
  }));

  const normalizedExceptions = (task.exceptions || []).map((e: any) => ({
    id: e.id,
    task_id: e.picking_task_id,
    picking_task_id: e.picking_task_id,
    order_id: e.order_id,
    order_item_id: e.order_item_id,
    task_item_id: e.order_item_id,
    exception_type: e.type,
    type: e.type,
    requested_qty: e.requested_change?.requested_qty ?? null,
    actual_qty: e.requested_change?.actual_qty ?? null,
    proposed_product_id: e.requested_change?.proposed_product_id ?? null,
    reason: e.reason,
    status: e.status,
    reported_by: e.reported_by,
    reported_at: e.created_at,
    resolved_by: e.resolved_by,
    resolved_at: e.resolved_at,
    reporter: e.reporter ? { ...e.reporter, full_name: e.reporter.name } : null,
    resolver: e.resolver ? { ...e.resolver, full_name: e.resolver.name } : null,
  }));

  return {
    ...task,
    task_number: (task.order as any)?.order_code || task.id.slice(0, 8),
    version: task.source_confirmation_version,
    delivery_date: taskDate,
    notes: task.note,
    is_overdue: isOverdue,
    assigned_to_profile: normalizedProfile,
    items: normalizedItems,
    exceptions: normalizedExceptions,
  };
}

/**
 * Nhận tác vụ soạn hàng (Khóa nguyên tử qua RPC)
 */
export async function claimPickingTaskCore(
  supabase: SupabaseClient,
  taskId: string,
  actorId: string
) {
  const { data, error } = await supabase.rpc("claim_picking_task", {
    p_task_id: taskId,
    p_actor_id: actorId,
    p_staff_id: actorId,
  });

  if (error) throw error;
  if (!data?.success) {
    throw new Error(data?.message || "Không thể nhận tác vụ soạn hàng");
  }

  return data;
}

/**
 * Cập nhật số lượng soạn từng mặt hàng
 */
export async function updatePickingItems(
  supabase: SupabaseClient,
  taskId: string,
  actorId: string,
  items: Array<{ id: string; picked_qty: number; note?: string }>
) {
  const { data: task, error: taskErr } = await supabase
    .from("picking_tasks")
    .select("id, status, assigned_to")
    .eq("id", taskId)
    .single();

  if (taskErr || !task) throw new Error("Không tìm thấy tác vụ soạn hàng");

  // Kiểm tra người được giao việc: chỉ người được giao việc hoặc admin/truong_phong mới có quyền
  if (task.assigned_to && task.assigned_to !== actorId) {
    const { data: actorProfile } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("id", actorId)
      .maybeSingle();
    const actorRole = actorProfile?.role || "";
    if (!["admin", "truong_phong"].includes(actorRole)) {
      throw new Error("Không thể cập nhật: Tác vụ soạn hàng này được giao cho nhân viên khác. Chỉ người được giao việc mới có thể cập nhật kết quả.");
    }
  }

  for (const item of items) {
    const picked = Number(item.picked_qty) || 0;
    const { error: itemErr } = await supabase
      .from("picking_task_items")
      .update({
        picked_qty: picked,
        exception_reason: item.note ?? null,
        status: picked > 0 ? "picked" : "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("picking_task_id", taskId);

    if (itemErr) throw itemErr;
  }

  if (task.status === "accepted") {
    await supabase
      .from("picking_tasks")
      .update({
        status: "picking",
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);
  }

  return { success: true };
}

/**
 * Báo cáo ngoại lệ phát sinh khi soạn hàng
 */
export async function reportPickingExceptionCore(
  supabase: SupabaseClient,
  params: {
    taskId: string;
    taskItemId?: string | null;
    orderId: string;
    exceptionType: "shortage" | "substitution" | "damaged" | "price_discrepancy" | "other";
    requestedQty?: number | null;
    actualQty?: number | null;
    proposedProductId?: string | null;
    reason: string;
    reportedBy: string;
  }
) {
  const {
    taskId,
    taskItemId,
    orderId,
    exceptionType,
    requestedQty,
    actualQty,
    proposedProductId,
    reason,
    reportedBy,
  } = params;

  if (!reason.trim()) {
    throw new Error("Bắt buộc phải nhập lý do ngoại lệ!");
  }

  const requestedChange = {
    requested_qty: requestedQty != null ? Number(requestedQty) : null,
    actual_qty: actualQty != null ? Number(actualQty) : null,
    proposed_product_id: proposedProductId || null,
  };

  let resolvedOrderItemId = (params as any).orderItemId || null;
  if (!resolvedOrderItemId && taskItemId) {
    const { data: item } = await supabase
      .from("picking_task_items")
      .select("order_item_id")
      .eq("id", taskItemId)
      .maybeSingle();
    resolvedOrderItemId = item?.order_item_id || null;
  }

  const { data: exception, error: excErr } = await supabase
    .from("picking_exceptions")
    .insert({
      picking_task_id: taskId,
      order_id: orderId,
      order_item_id: resolvedOrderItemId,
      type: exceptionType,
      requested_change: requestedChange,
      reason: reason.trim(),
      status: "pending",
      reported_by: reportedBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (excErr) throw excErr;

  // Cập nhật trạng thái task sang 'exception'
  await supabase
    .from("picking_tasks")
    .update({
      status: "exception",
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  // Nếu có taskItemId, cập nhật trạng thái dòng hàng
  if (taskItemId) {
    await supabase
      .from("picking_task_items")
      .update({
        status: "exception",
        exception_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskItemId);
  }

  // Gửi thông báo nội bộ cho bộ phận Vận hành theo phòng ban
  let opDeptId: string | null = null;
  try {
    const { data: opDept } = await supabase
      .from("departments")
      .select("id")
      .or("function_group.eq.operations,function_group.eq.sale")
      .limit(1)
      .maybeSingle();
    opDeptId = opDept?.id || null;
  } catch {
    // Không bắt buộc phải có phòng ban
  }

  await createInternalNotification(supabase, {
    departmentId: opDeptId,
    eventType: "picking_exception_reported",
    entityType: "picking_task",
    entityId: taskId,
    title: `Ngoại lệ soạn hàng: Đơn #${orderId}`,
    body: `Loại: ${exceptionType}, Lý do: ${reason.trim()}`,
    deepLink: `/soan-hang?tab=exception`,
    idempotencyKey: `notif_exc_${exception.id}`,
  });

  return exception;
}

/**
 * Vận hành duyệt hoặc từ chối ngoại lệ soạn hàng
 */
export async function resolvePickingExceptionCore(
  supabase: SupabaseClient,
  params: {
    exceptionId: string;
    action: "accept_shortage" | "accept_substitution" | "reject";
    resolvedBy: string;
    resolutionAction?: string;
  }
) {
  const { exceptionId, action, resolvedBy } = params;

  const { data: exception, error: fetchErr } = await supabase
    .from("picking_exceptions")
    .select("id, picking_task_id, status, reported_by")
    .eq("id", exceptionId)
    .single();

  if (fetchErr || !exception) throw new Error("Không tìm thấy bản ghi ngoại lệ");
  if (exception.status !== "pending") throw new Error("Ngoại lệ đã được xử lý trước đó");

  const newStatus = action === "reject" ? "rejected" : "approved";
  const { error: updErr } = await supabase
    .from("picking_exceptions")
    .update({
      status: newStatus,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", exceptionId);

  if (updErr) throw updErr;

  // Kiểm tra xem task còn exception nào 'pending' không
  const { data: openExceptions } = await supabase
    .from("picking_exceptions")
    .select("id")
    .eq("picking_task_id", exception.picking_task_id)
    .eq("status", "pending");

  if (!openExceptions || openExceptions.length === 0) {
    // Không còn ngoại lệ mở, chuyển task về 'picking'
    await supabase
      .from("picking_tasks")
      .update({
        status: "picking",
        updated_at: new Date().toISOString(),
      })
      .eq("id", exception.picking_task_id);
  }

  // Thông báo kết quả xử lý ngoại lệ cho người báo cáo (nhân viên kho)
  if (exception.reported_by) {
    const statusText = newStatus === "approved" ? "đã được duyệt" : "đã bị từ chối";
    await createInternalNotification(supabase, {
      recipientUserId: exception.reported_by,
      eventType: "picking_exception_resolved",
      entityType: "picking_task",
      entityId: exception.picking_task_id,
      title: `Ngoại lệ soạn hàng ${statusText}`,
      body: `Ngoại lệ cho tác vụ đã được xử lý: ${statusText}.`,
      deepLink: `/soan-hang`,
      idempotencyKey: `notif_exc_res_${exceptionId}_${Date.now()}`,
    });
  }

  return { success: true };
}

/**
 * Hoàn tất tác vụ soạn hàng
 */
export async function completePickingTaskCore(
  supabase: SupabaseClient,
  taskId: string,
  actorId: string,
  actorName: string = "Nhân viên"
) {
  const { data: task, error: taskErr } = await supabase
    .from("picking_tasks")
    .select(`
      id,
      order_id,
      status,
      assigned_to,
      order:orders(id, order_code, status),
      exceptions:picking_exceptions(id, status)
    `)
    .eq("id", taskId)
    .single();

  if (taskErr || !task) throw new Error("Không tìm thấy tác vụ soạn hàng");

  // Kiểm tra người được giao việc: chỉ người được giao việc hoặc admin/truong_phong mới có quyền
  if (task.assigned_to && task.assigned_to !== actorId) {
    const { data: actorProfile } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("id", actorId)
      .maybeSingle();
    const actorRole = actorProfile?.role || "";
    if (!["admin", "truong_phong"].includes(actorRole)) {
      throw new Error("Không thể hoàn tất: Tác vụ soạn hàng này được giao cho nhân viên khác. Chỉ người được giao việc mới có thể hoàn tất.");
    }
  }

  // Kiểm tra ngoại lệ mở
  const hasOpenExceptions = (task.exceptions || []).some((e: any) => e.status === "pending" || e.status === "open");
  if (hasOpenExceptions) {
    throw new Error("Không thể hoàn tất soạn hàng khi vẫn còn ngoại lệ chưa được xử lý!");
  }

  const now = new Date().toISOString();

  // 1. Cập nhật picking_tasks sang 'completed'
  const { error: updTaskErr } = await supabase
    .from("picking_tasks")
    .update({
      status: "completed",
      completed_at: now,
      updated_at: now,
    })
    .eq("id", taskId);

  if (updTaskErr) throw updTaskErr;

  // 2. Cập nhật order packing_status sang 'done'
  if (task.order_id) {
    await supabase
      .from("orders")
      .update({
        packing_status: "done",
        packed_at: now,
        packed_by: actorId,
        updated_at: now,
      })
      .eq("id", task.order_id);

    // Ghi audit order_history
    await supabase.from("order_history").insert({
      order_id: task.order_id,
      action: "packing_completed",
      note: `Hoàn tất soạn hàng tác vụ ${taskId} bởi ${actorName}`,
      actor: actorName,
    });
  }

  return { success: true };
}
