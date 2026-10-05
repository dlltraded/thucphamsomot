import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import { createInternalNotification } from "@/lib/notification-service";

export type ReviewStatus =
  | 'pending_acceptance'
  | 'in_review'
  | 'responded'
  | 'needs_revision'
  | 'accepted_by_operations'
  | 'superseded'
  | 'canceled';

export type ItemResultStatus =
  | 'pending'
  | 'available'
  | 'partial'
  | 'need_purchase'
  | 'out_of_stock'
  | 'substitution_proposed'
  | 'price_pending'
  | 'price_proposed';

export interface ProcurementReviewItemInput {
  id: string;
  result_status: ItemResultStatus;
  available_qty: number;
  proposed_product_id?: string | null;
  proposed_price?: number | null;
  expected_at?: string | null;
  note?: string | null;
}

/**
 * Danh sách yêu cầu kiểm tra hàng — phân trang server-side, bộ lọc linh hoạt.
 */
export async function listProcurementReviews(params: {
  status?: string;
  tab?: 'all' | 'pending' | 'my_review' | 'waiting_op' | 'revision' | 'completed';
  deliveryDate?: string;
  assignedTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  currentUserId?: string;
  supabaseClient?: any;
}) {
  const supabase = params.supabaseClient || getCustomerSupabaseAdmin();
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('procurement_review_requests')
    .select(`
      id,
      order_id,
      version,
      status,
      requested_by,
      assigned_to,
      accepted_at,
      responded_at,
      operation_accepted_at,
      due_at,
      note,
      created_at,
      updated_at,
      orders:order_id (
        id,
        order_code,
        delivery_date,
        delivery_shift,
        delivery_name,
        delivery_phone,
        delivery_address,
        customer_name,
        customer_company,
        customer_phone,
        status,
        grand_total,
        order_items (id, name, sku, unit, quantity)
      ),
      requested_by_profile:requested_by (id, name, email, role),
      assigned_to_profile:assigned_to (id, name, email, role)
    `, { count: 'exact' });

  // Lọc theo Tab nghiệp vụ
  if (params.tab === 'pending') {
    query = query.eq('status', 'pending_acceptance');
  } else if (params.tab === 'my_review' && params.currentUserId) {
    query = query.eq('status', 'in_review').eq('assigned_to', params.currentUserId);
  } else if (params.tab === 'waiting_op') {
    query = query.eq('status', 'responded');
  } else if (params.tab === 'revision') {
    query = query.eq('status', 'needs_revision');
  } else if (params.tab === 'completed') {
    query = query.eq('status', 'accepted_by_operations');
  } else if (params.status) {
    query = query.eq('status', params.status);
  }

  if (params.assignedTo) {
    query = query.eq('assigned_to', params.assignedTo);
  }

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  // Lấy danh sách item để đếm thống kê cho từng review
  const reviewIds = ((data || []) as any[]).map((r: any) => r.id);
  const itemsMap: Record<string, { totalItems: number; shortageItems: number; pendingItems: number }> = {};

  if (reviewIds.length > 0) {
    const { data: itemsData, error: itemsError } = await supabase
      .from('procurement_review_items')
      .select('review_id, result_status, shortage_qty')
      .in('review_id', reviewIds);

    if (!itemsError && itemsData) {
      for (const item of itemsData) {
        if (!itemsMap[item.review_id]) {
          itemsMap[item.review_id] = { totalItems: 0, shortageItems: 0, pendingItems: 0 };
        }
        itemsMap[item.review_id].totalItems++;
        if (Number(item.shortage_qty) > 0 || ['partial', 'out_of_stock', 'need_purchase'].includes(item.result_status)) {
          itemsMap[item.review_id].shortageItems++;
        }
        if (item.result_status === 'pending') {
          itemsMap[item.review_id].pendingItems++;
        }
      }
    }
  }

  const now = Date.now();
  const normalizeProfile = (p: any) => p ? { ...p, full_name: p.name || p.full_name || '' } : null;

  const enrichedData = (data || []).map((r: any) => {
    const stats = itemsMap[r.id] || { totalItems: 0, shortageItems: 0, pendingItems: 0 };
    const createdAtMs = new Date(r.created_at).getTime();
    const waitingMinutes = Math.floor((now - createdAtMs) / (1000 * 60));

    // Cảnh báo SLA:
    // - Chờ Thu mua tiếp nhận > 15 phút
    // - Thu mua đang xử lý > 30 phút
    const isSlaBreached =
      (r.status === 'pending_acceptance' && waitingMinutes > 15) ||
      (r.status === 'in_review' && waitingMinutes > 30);

    return {
      ...r,
      requested_by_profile: normalizeProfile(r.requested_by_profile),
      assigned_to_profile: normalizeProfile(r.assigned_to_profile),
      itemStats: stats,
      waitingMinutes,
      isSlaBreached,
    };
  });

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data: enrichedData,
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * Chi tiết một yêu cầu kiểm tra hàng kèm items, sản phẩm đề xuất, và lịch sử audit
 */
export async function getProcurementReviewDetail(id: string, supabaseClient?: any) {
  const supabase = supabaseClient || getCustomerSupabaseAdmin();

  const { data: review, error: reviewError } = await supabase
    .from('procurement_review_requests')
    .select(`
      id,
      order_id,
      version,
      status,
      requested_by,
      assigned_to,
      accepted_at,
      responded_at,
      operation_accepted_at,
      due_at,
      note,
      created_at,
      updated_at,
      orders:order_id (
        id,
        order_code,
        delivery_date,
        delivery_shift,
        delivery_name,
        delivery_phone,
        delivery_address,
        customer_name,
        customer_company,
        customer_phone,
        status,
        grand_total,
        order_items (id, name, sku, unit, quantity, unit_price, line_total)
      ),
      requested_by_profile:requested_by (id, name, email, role),
      assigned_to_profile:assigned_to (id, name, email, role)
    `)
    .eq('id', id)
    .maybeSingle();

  if (reviewError) throw reviewError;
  if (!review) return null;

  // Lấy chi tiết items kèm sản phẩm đề xuất
  const { data: items, error: itemsError } = await supabase
    .from('procurement_review_items')
    .select(`
      id,
      review_id,
      order_item_id,
      result_status,
      requested_qty,
      available_qty,
      shortage_qty,
      proposed_product_id,
      proposed_price,
      expected_at,
      note,
      updated_by,
      created_at,
      updated_at,
      proposed_product:proposed_product_id (id, sku, name, price)
    `)
    .eq('review_id', id)
    .order('created_at', { ascending: true });

  if (itemsError) throw itemsError;

  // Lấy audit logs
  const { data: auditLogs, error: auditError } = await supabase
    .from('procurement_review_audit_logs')
    .select(`
      id,
      action,
      actor_id,
      old_state,
      new_state,
      reason,
      created_at,
      actor:actor_id (id, name, email, role)
    `)
    .eq('review_id', id)
    .order('created_at', { ascending: true });

  if (auditError) throw auditError;

  // Ghép order_item detail vào từng review item
  const rawOrderItems = (review.orders as any)?.order_items || [];
  const normalizedOrderItems = rawOrderItems.map((oi: any) => ({
    ...oi,
    product_name: oi.name,
    subtotal: oi.line_total ?? (Number(oi.quantity || 0) * Number(oi.unit_price || 0)),
  }));
  const orderItemLookup = new Map<string, any>(normalizedOrderItems.map((oi: any) => [oi.id, oi]));

  const enrichedItems = (items || []).map((item: any) => ({
    ...item,
    order_item: orderItemLookup.get(item.order_item_id) || null,
  }));

  const normalizeProfile = (p: any) => p ? { ...p, full_name: p.name || p.full_name || '' } : null;

  return {
    ...review,
    requested_by_profile: normalizeProfile(review.requested_by_profile),
    assigned_to_profile: normalizeProfile(review.assigned_to_profile),
    items: enrichedItems,
    auditLogs: (auditLogs || []).map((log: any) => ({
      ...log,
      actor: normalizeProfile(log.actor),
    })),
  };
}

/**
 * Vận hành gửi yêu cầu Thu mua kiểm tra hàng cho đơn
 */
export async function createProcurementReview(
  orderId: string,
  actorId: string,
  note?: string,
  supabaseClient?: any
) {
  const supabase = supabaseClient || getCustomerSupabaseAdmin();

  // 1. Kiểm tra đơn hàng
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_code, status, order_items (id, quantity)')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) throw orderError;
  if (!order) {
    throw new Error('Không tìm thấy đơn hàng');
  }

  if (['canceled', 'completed', 'merged'].includes(order.status)) {
    throw new Error(`Đơn hàng ở trạng thái ${order.status}, không thể gửi yêu cầu kiểm tra`);
  }

  // 2. Kiểm tra xem có phiên kiểm tra đang mở không
  const { data: activeReview, error: activeErr } = await supabase
    .from('procurement_review_requests')
    .select('id, status, version')
    .eq('order_id', orderId)
    .in('status', ['pending_acceptance', 'in_review', 'responded', 'needs_revision'])
    .maybeSingle();

  if (activeErr) throw activeErr;
  if (activeReview) {
    throw new Error(`Đơn hàng đã có yêu cầu kiểm tra đang hoạt động (phiên bản ${activeReview.version}, trạng thái ${activeReview.status})`);
  }

  // 3. Lấy version tiếp theo
  const { data: latestVersionData } = await supabase
    .from('procurement_review_requests')
    .select('version')
    .eq('order_id', orderId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latestVersionData?.version || 0) + 1;

  // 4. Tạo procurement_review_requests
  const { data: newReview, error: createError } = await supabase
    .from('procurement_review_requests')
    .insert({
      order_id: orderId,
      version: nextVersion,
      status: 'pending_acceptance',
      requested_by: actorId,
      note: note || null,
    })
    .select()
    .single();

  if (createError) throw createError;

  // 5. Tạo review_items cho từng mặt hàng trong đơn
  const orderItems = order.order_items || [];
  if (orderItems.length > 0) {
    const reviewItems = orderItems.map((oi: any) => ({
      review_id: newReview.id,
      order_item_id: oi.id,
      result_status: 'pending',
      requested_qty: Number(oi.quantity || 0),
      available_qty: 0,
    }));

    const { error: insertItemsErr } = await supabase
      .from('procurement_review_items')
      .insert(reviewItems);

    if (insertItemsErr) throw insertItemsErr;
  }

  // 6. Ghi audit log
  await supabase.from('procurement_review_audit_logs').insert({
    review_id: newReview.id,
    order_id: orderId,
    action: 'request_review',
    actor_id: actorId,
    new_state: newReview,
    reason: note || 'Vận hành gửi yêu cầu Thu mua kiểm tra hàng',
  });

  // 7. Tạo thông báo nội bộ cho phòng Thu mua
  // Lấy department_id của phòng Thu mua để gửi thông báo đúng đối tượng
  let thuMuaDeptId: string | null = null;
  try {
    const { data: tmDept } = await supabase
      .from('departments')
      .select('id')
      .eq('function_group', 'procurement')
      .maybeSingle();
    thuMuaDeptId = tmDept?.id || null;
  } catch {
    // Không bắt buộc phải có phòng ban — thông báo vẫn được gửi dưới dạng broadcast nếu chưa có phòng ban
  }

  await createInternalNotification(supabase, {
    departmentId: thuMuaDeptId,
    eventType: 'procurement_review_requested',
    entityType: 'procurement_review',
    entityId: newReview.id,
    title: `Yêu cầu kiểm tra đơn #${order.order_code}`,
    body: `Đơn #${order.order_code} có ${orderItems.length} mặt hàng cần Thu mua kiểm tra đáp ứng.`,
    deepLink: `/kiem-tra-hang?id=${newReview.id}`,
    idempotencyKey: `notif_review_req_${newReview.id}`,
  });

  return newReview;
}

/**
 * Nhân viên Thu mua tiếp nhận yêu cầu (khóa nguyên tử qua RPC)
 */
export async function claimProcurementReview(reviewId: string, actorId: string, supabaseClient?: any) {
  const supabase = supabaseClient || getCustomerSupabaseAdmin();

  const { data, error } = await supabase.rpc('claim_procurement_review', {
    p_review_id: reviewId,
    p_actor_id: actorId,
  });

  if (error) throw error;
  if (!data?.success) {
    throw new Error(data?.message || 'Không thể tiếp nhận yêu cầu kiểm tra');
  }

  return data.data;
}

/**
 * Thu mua lưu nháp kết quả kiểm tra
 */
export async function saveProcurementReviewDraft(
  reviewId: string,
  actorId: string,
  items: ProcurementReviewItemInput[],
  supabaseClient?: any
) {
  const supabase = supabaseClient || getCustomerSupabaseAdmin();

  const { data: review, error: reviewErr } = await supabase
    .from('procurement_review_requests')
    .select('id, status, assigned_to, order_id')
    .eq('id', reviewId)
    .single();

  if (reviewErr) throw reviewErr;
  if (!review) throw new Error('Không tìm thấy yêu cầu kiểm tra');

  if (!['in_review', 'needs_revision'].includes(review.status)) {
    throw new Error('Chỉ có thể lưu nháp khi yêu cầu đang trong trạng thái kiểm tra');
  }

  // Kiểm tra quyền: chỉ người được giao việc (assigned_to) mới được lưu kết quả
  // Admin và truong_phong có thể can thiệp nhưng phải gọi qua API đã xác thực role
  if (review.assigned_to && review.assigned_to !== actorId) {
    // Kiểm tra role của actorId
    const { data: actorProfile } = await supabase
      .from('admin_profiles')
      .select('role')
      .eq('id', actorId)
      .maybeSingle();
    const actorRole = actorProfile?.role || '';
    if (!['admin', 'truong_phong'].includes(actorRole)) {
      throw new Error(`Không thể lưu náp: Yêu cầu kiểm tra này được giao cho nhân viên khác. Chỉ người được giao việc mới có thể cập nhật kết quả.`);
    }
  }

  // Cập nhật từng item
  for (const item of items) {
    const updatePayload: any = {
      result_status: item.result_status,
      available_qty: Number(item.available_qty || 0),
      proposed_product_id: item.proposed_product_id || null,
      proposed_price: item.proposed_price != null ? Number(item.proposed_price) : null,
      expected_at: item.expected_at || null,
      note: item.note || null,
      updated_by: actorId,
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await supabase
      .from('procurement_review_items')
      .update(updatePayload)
      .eq('id', item.id)
      .eq('review_id', reviewId);

    if (updateErr) throw updateErr;
  }

  // Ghi audit
  await supabase.from('procurement_review_audit_logs').insert({
    review_id: reviewId,
    order_id: review.order_id,
    action: 'save_draft',
    actor_id: actorId,
    new_state: { itemsCount: items.length },
    reason: 'Thu mua lưu nháp kết quả kiểm tra',
  });

  return { success: true };
}

/**
 * Thu mua gửi kết quả kiểm tra cho Vận hành
 * Ràng buộc: Tất cả các dòng hàng phải có kết luận (không được còn pending)
 */
export async function submitProcurementReview(
  reviewId: string,
  actorId: string,
  items: ProcurementReviewItemInput[],
  note?: string,
  supabaseClient?: any
) {
  const supabase = supabaseClient || getCustomerSupabaseAdmin();

  const { data: review, error: reviewErr } = await supabase
    .from('procurement_review_requests')
    .select('id, status, assigned_to, order_id, orders:order_id (order_code)')
    .eq('id', reviewId)
    .single();

  if (reviewErr) throw reviewErr;
  if (!review) throw new Error('Không tìm thấy yêu cầu kiểm tra');

  if (!['in_review', 'needs_revision'].includes(review.status)) {
    throw new Error('Chỉ có thể gửi kết quả khi yêu cầu đang trong trạng thái kiểm tra');
  }

  // Lưu items trước
  await saveProcurementReviewDraft(reviewId, actorId, items, supabase);

  // Kiểm tra xem còn dòng nào pending không
  const { data: pendingItems, error: pendingErr } = await supabase
    .from('procurement_review_items')
    .select('id')
    .eq('review_id', reviewId)
    .eq('result_status', 'pending');

  if (pendingErr) throw pendingErr;
  if (pendingItems && pendingItems.length > 0) {
    throw new Error(`Còn ${pendingItems.length} mặt hàng chưa có kết luận. Vui lòng kiểm tra hết trước khi gửi kết quả.`);
  }

  // Chuyển trạng thái sang responded
  const now = new Date().toISOString();
  const { data: updatedReview, error: updateErr } = await supabase
    .from('procurement_review_requests')
    .update({
      status: 'responded',
      responded_at: now,
      note: note || null,
      updated_at: now,
    })
    .eq('id', reviewId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // Ghi audit
  await supabase.from('procurement_review_audit_logs').insert({
    review_id: reviewId,
    order_id: review.order_id,
    action: 'submit_review',
    actor_id: actorId,
    new_state: updatedReview,
    reason: note || 'Thu mua gửi kết quả kiểm tra cho Vận hành',
  });

  // Thông báo cho người gửi yêu cầu (Vận hành)
  const orderCode = (review.orders as any)?.order_code || '';
  await createInternalNotification(supabase, {
    recipientUserId: updatedReview.requested_by,
    eventType: 'procurement_review_responded',
    entityType: 'procurement_review',
    entityId: reviewId,
    title: `Thu mua đã phản hồi đơn #${orderCode}`,
    body: `Thu mua đã hoàn tất kiểm tra mặt hàng cho đơn #${orderCode}.`,
    deepLink: `/orders/${review.order_id}`,
    idempotencyKey: `notif_review_resp_${reviewId}_${now}`,
  });

  return updatedReview;
}

/**
 * Vận hành chấp nhận kết quả kiểm tra của Thu mua
 */
export async function operationsAcceptReview(
  reviewId: string,
  actorId: string,
  note?: string,
  supabaseClient?: any
) {
  const supabase = supabaseClient || getCustomerSupabaseAdmin();

  const { data: review, error: reviewErr } = await supabase
    .from('procurement_review_requests')
    .select('id, status, assigned_to, order_id, orders:order_id (order_code)')
    .eq('id', reviewId)
    .single();

  if (reviewErr) throw reviewErr;
  if (!review) throw new Error('Không tìm thấy yêu cầu kiểm tra');

  if (review.status !== 'responded') {
    throw new Error('Chỉ có thể chấp nhận khi Thu mua đã gửi phản hồi');
  }

  const now = new Date().toISOString();
  const { data: updatedReview, error: updateErr } = await supabase
    .from('procurement_review_requests')
    .update({
      status: 'accepted_by_operations',
      operation_accepted_at: now,
      updated_at: now,
    })
    .eq('id', reviewId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // Ghi audit
  await supabase.from('procurement_review_audit_logs').insert({
    review_id: reviewId,
    order_id: review.order_id,
    action: 'accept_operations',
    actor_id: actorId,
    new_state: updatedReview,
    reason: note || 'Vận hành chấp nhận kết quả kiểm tra từ Thu mua',
  });

  // Thông báo cho nhân viên Thu mua phụ trách
  const orderCode = (review.orders as any)?.order_code || '';
  if (review.assigned_to) {
    await createInternalNotification(supabase, {
      recipientUserId: review.assigned_to,
      eventType: 'procurement_review_accepted',
      entityType: 'procurement_review',
      entityId: reviewId,
      title: `Vận hành đã duyệt phương án đơn #${orderCode}`,
      body: `Vận hành đã chấp thuận phương án kiểm tra mặt hàng.`,
      deepLink: `/kiem-tra-hang?id=${reviewId}`,
      idempotencyKey: `notif_review_acc_${reviewId}_${now}`,
    });
  }

  return updatedReview;
}

/**
 * Vận hành yêu cầu Thu mua kiểm tra lại
 */
export async function operationsRequestRevision(
  reviewId: string,
  actorId: string,
  reason: string,
  supabaseClient?: any
) {
  if (!reason || !reason.trim()) {
    throw new Error('Bắt buộc phải nhập lý do yêu cầu kiểm tra lại');
  }

  const supabase = supabaseClient || getCustomerSupabaseAdmin();

  const { data: review, error: reviewErr } = await supabase
    .from('procurement_review_requests')
    .select('id, status, assigned_to, order_id, orders:order_id (order_code)')
    .eq('id', reviewId)
    .single();

  if (reviewErr) throw reviewErr;
  if (!review) throw new Error('Không tìm thấy yêu cầu kiểm tra');

  if (review.status !== 'responded') {
    throw new Error('Chỉ có thể yêu cầu kiểm tra lại khi Thu mua đã phản hồi');
  }

  const now = new Date().toISOString();
  const { data: updatedReview, error: updateErr } = await supabase
    .from('procurement_review_requests')
    .update({
      status: 'needs_revision',
      note: reason.trim(),
      updated_at: now,
    })
    .eq('id', reviewId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // Ghi audit
  await supabase.from('procurement_review_audit_logs').insert({
    review_id: reviewId,
    order_id: review.order_id,
    action: 'request_revision',
    actor_id: actorId,
    new_state: updatedReview,
    reason: reason.trim(),
  });

  // Thông báo lại cho nhân viên Thu mua phụ trách
  const orderCode = (review.orders as any)?.order_code || '';
  if (review.assigned_to) {
    await createInternalNotification(supabase, {
      recipientUserId: review.assigned_to,
      eventType: 'procurement_review_revision_requested',
      entityType: 'procurement_review',
      entityId: reviewId,
      title: `Yêu cầu kiểm tra lại đơn #${orderCode}`,
      body: `Lý do: ${reason.trim()}`,
      deepLink: `/kiem-tra-hang?id=${reviewId}`,
      idempotencyKey: `notif_review_rev_${reviewId}_${now}`,
    });
  }

  return updatedReview;
}
