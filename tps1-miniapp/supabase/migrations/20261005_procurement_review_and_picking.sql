-- Migration: 20261005_procurement_review_and_picking.sql
-- Triển khai phân hệ Thu mua kiểm tra hàng và Soạn hàng TPS1 (G1)
-- Tuân thủ: docs/GEMINI_THU_MUA_KIEM_TRA_VA_SOAN_HANG_PLAN.md

-- 1. Bảng procurement_review_requests (Yêu cầu Thu mua kiểm tra hàng)
create table if not exists public.procurement_review_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  version integer not null default 1,
  status text not null default 'pending_acceptance' check (status in (
    'pending_acceptance',    -- Chờ Thu mua tiếp nhận
    'in_review',             -- Thu mua đang kiểm tra
    'responded',             -- Thu mua đã gửi kết quả
    'needs_revision',        -- Vận hành yêu cầu Thu mua kiểm tra lại
    'accepted_by_operations',-- Vận hành đã chấp nhận kết quả
    'superseded',            -- Phiên cũ bị thay thế bởi phiên kiểm tra mới
    'canceled'               -- Đơn hủy hoặc yêu cầu bị hủy
  )),
  requested_by uuid not null references public.admin_profiles(id),
  assigned_to uuid references public.admin_profiles(id),
  accepted_at timestamptz,
  responded_at timestamptz,
  operation_accepted_at timestamptz,
  due_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_procurement_review_order_version unique (order_id, version)
);

-- Chỉ mục hỗ trợ truy vấn hàng đợi & SLA
create index if not exists idx_proc_review_status on public.procurement_review_requests (status);
create index if not exists idx_proc_review_assigned_to on public.procurement_review_requests (assigned_to);
create index if not exists idx_proc_review_order_id on public.procurement_review_requests (order_id);
create index if not exists idx_proc_review_created_at on public.procurement_review_requests (created_at desc);

-- 2. Bảng procurement_review_items (Chi tiết từng mặt hàng trong phiên kiểm tra)
create table if not exists public.procurement_review_items (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.procurement_review_requests(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  result_status text not null default 'pending' check (result_status in (
    'pending',               -- Chưa kiểm tra
    'available',             -- Đủ hàng
    'partial',               -- Chỉ đáp ứng được một phần
    'need_purchase',         -- Cần mua thêm, có thời gian dự kiến
    'out_of_stock',          -- Hết hàng/không thể đáp ứng
    'substitution_proposed', -- Đề xuất sản phẩm thay thế
    'price_pending',         -- Chờ xác nhận giá
    'price_proposed'         -- Thu mua đã đề xuất giá đầu vào/tham khảo
  )),
  requested_qty numeric(12,3) not null check (requested_qty >= 0),
  available_qty numeric(12,3) not null default 0 check (available_qty >= 0),
  shortage_qty numeric(12,3) generated always as (greatest(coalesce(requested_qty, 0) - coalesce(available_qty, 0), 0)) stored,
  proposed_product_id uuid references public.products(id),
  proposed_price numeric(14,2) check (proposed_price is null or proposed_price >= 0),
  expected_at timestamptz,
  note text,
  updated_by uuid references public.admin_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_proc_review_order_item unique (review_id, order_item_id)
);

create index if not exists idx_proc_review_items_review_id on public.procurement_review_items (review_id);
create index if not exists idx_proc_review_items_result_status on public.procurement_review_items (result_status);

-- 3. Bảng procurement_review_audit_logs (Lịch sử kiểm tra hàng)
create table if not exists public.procurement_review_audit_logs (
  id uuid primary key default gen_random_uuid(),
  review_id uuid references public.procurement_review_requests(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  action text not null, -- 'request_review', 'claim_review', 'save_draft', 'submit_review', 'request_revision', 'accept_operations', 'reassign', 'cancel'
  actor_id uuid references public.admin_profiles(id),
  old_state jsonb,
  new_state jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_proc_review_audit_review_id on public.procurement_review_audit_logs (review_id);
create index if not exists idx_proc_review_audit_order_id on public.procurement_review_audit_logs (order_id);

-- 4. Bảng picking_tasks (Tác vụ soạn hàng)
create table if not exists public.picking_tasks (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null default 'released' check (status in (
    'released',   -- Đơn đã xác nhận, chờ nhận soạn
    'accepted',   -- Nhân viên đã nhận soạn
    'picking',    -- Đang soạn
    'exception',  -- Có thiếu/đổi/sai số lượng cần Vận hành xử lý
    'completed',  -- Soạn xong
    'canceled',   -- Đơn bị hủy hợp lệ trước khi giao
    'superseded'  -- Bị thay thế bởi phiên bản xác nhận mới
  )),
  assigned_to uuid references public.admin_profiles(id),
  accepted_at timestamptz,
  completed_at timestamptz,
  source_confirmation_version integer not null default 1,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_picking_order_version unique (order_id, source_confirmation_version)
);

create index if not exists idx_picking_tasks_status on public.picking_tasks (status);
create index if not exists idx_picking_tasks_assigned_to on public.picking_tasks (assigned_to);
create index if not exists idx_picking_tasks_order_id on public.picking_tasks (order_id);

-- 5. Bảng picking_task_items (Chi tiết từng dòng soạn hàng)
create table if not exists public.picking_task_items (
  id uuid primary key default gen_random_uuid(),
  picking_task_id uuid not null references public.picking_tasks(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  confirmed_qty numeric(12,3) not null check (confirmed_qty >= 0),
  picked_qty numeric(12,3) not null default 0 check (picked_qty >= 0),
  status text not null default 'pending' check (status in ('pending', 'picked', 'partial', 'exception')),
  exception_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_picking_task_order_item unique (picking_task_id, order_item_id)
);

create index if not exists idx_picking_task_items_task_id on public.picking_task_items (picking_task_id);

-- 6. Bảng picking_exceptions (Ngoại lệ phát sinh khi soạn hàng)
create table if not exists public.picking_exceptions (
  id uuid primary key default gen_random_uuid(),
  picking_task_id uuid not null references public.picking_tasks(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  type text not null check (type in ('shortage', 'substitution', 'damaged', 'price_discrepancy', 'other')),
  requested_change jsonb,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'canceled')),
  reported_by uuid not null references public.admin_profiles(id),
  resolved_by uuid references public.admin_profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_picking_exceptions_task_id on public.picking_exceptions (picking_task_id);
create index if not exists idx_picking_exceptions_status on public.picking_exceptions (status);

-- 7. Bảng picking_audit_logs (Lịch sử soạn hàng)
create table if not exists public.picking_audit_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.picking_tasks(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  action text not null, -- 'release_task', 'claim_task', 'update_items', 'report_exception', 'resolve_exception', 'complete_task', 'reassign'
  actor_id uuid references public.admin_profiles(id),
  old_state jsonb,
  new_state jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_picking_audit_task_id on public.picking_audit_logs (task_id);

-- 8. Bảng internal_notifications (Thông báo nội bộ trong hệ thống)
create table if not exists public.internal_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid references public.admin_profiles(id),
  department_id uuid references public.departments(id),
  event_type text not null,
  entity_type text not null,
  entity_id text not null,
  title text not null,
  body text,
  deep_link text,
  read_at timestamptz,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_notif_recipient_read on public.internal_notifications (recipient_user_id, read_at);
create index if not exists idx_notif_dept_read on public.internal_notifications (department_id, read_at);

-- 9. RPC: claim_procurement_review (Khóa nguyên tử nhận kiểm tra hàng)
create or replace function public.claim_procurement_review(
  p_review_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_review record;
  v_updated record;
  v_actor_role text;
begin
  -- Kiểm tra role người tiếp nhận phải là thu_mua, truong_phong hoặc admin
  select role into v_actor_role
  from public.admin_profiles
  where id = p_actor_id and is_active = true;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'ACTOR_NOT_FOUND', 'message', 'Không tìm thấy thông tin nhân viên tiếp nhận.');
  end if;

  if v_actor_role not in ('thu_mua', 'truong_phong', 'admin') then
    return jsonb_build_object('success', false, 'error_code', 'FORBIDDEN', 'message', format('Nhân viên với role "%s" không được phép tiếp nhận yêu cầu kiểm tra. Chỉ Thu mua hoặc Trưởng phòng mới có quyền này.', v_actor_role));
  end if;

  select * into v_review
  from public.procurement_review_requests
  where id = p_review_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'message', 'Không tìm thấy yêu cầu kiểm tra hàng.');
  end if;

  if v_review.assigned_to is not null and v_review.assigned_to != p_actor_id then
    return jsonb_build_object('success', false, 'error_code', 'ALREADY_CLAIMED', 'message', 'Yêu cầu đã được nhân viên khác tiếp nhận.');
  end if;

  if v_review.status != 'pending_acceptance' and v_review.status != 'needs_revision' then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_STATUS', 'message', 'Yêu cầu không ở trạng thái chờ tiếp nhận.');
  end if;

  update public.procurement_review_requests
  set assigned_to = p_actor_id,
      status = 'in_review',
      accepted_at = coalesce(accepted_at, now()),
      updated_at = now()
  where id = p_review_id
  returning * into v_updated;

  insert into public.procurement_review_audit_logs (
    review_id, order_id, action, actor_id, old_state, new_state, reason
  ) values (
    p_review_id,
    v_review.order_id,
    'claim_review',
    p_actor_id,
    to_jsonb(v_review),
    to_jsonb(v_updated),
    'Nhân viên Thu mua tiếp nhận yêu cầu kiểm tra hàng'
  );

  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'id', v_updated.id,
      'status', v_updated.status,
      'assigned_to', v_updated.assigned_to,
      'accepted_at', v_updated.accepted_at
    )
  );

EXCEPTION WHEN OTHERS THEN
  return jsonb_build_object(
    'success', false,
    'error_code', 'INTERNAL_ERROR',
    'message', format('Lỗi khi tiếp nhận kiểm tra hàng: %s', SQLERRM)
  );
end;
$$;

-- 10. RPC: claim_picking_task (Khóa nguyên tử nhận soạn hàng)
create or replace function public.claim_picking_task(
  p_task_id uuid,
  p_actor_id uuid default null,
  p_staff_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_task record;
  v_updated record;
  v_effective_actor uuid;
  v_actor_role text;
begin
  v_effective_actor := coalesce(p_actor_id, p_staff_id);
  if v_effective_actor is null then
    return jsonb_build_object('success', false, 'error_code', 'MISSING_ACTOR', 'message', 'Thiếu thông tin người nhận việc.');
  end if;

  -- Kiểm tra role người nhận việc phải là kho, truong_phong hoặc admin
  select role into v_actor_role
  from public.admin_profiles
  where id = v_effective_actor and is_active = true;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'ACTOR_NOT_FOUND', 'message', 'Không tìm thấy thông tin nhân viên nhận soạn.');
  end if;

  if v_actor_role not in ('kho', 'truong_phong', 'admin') then
    return jsonb_build_object('success', false, 'error_code', 'FORBIDDEN', 'message', format('Nhân viên với role "%s" không được phép nhận soạn hàng. Chỉ nhân viên Kho hoặc Trưởng phòng mới có quyền này.', v_actor_role));
  end if;

  select * into v_task
  from public.picking_tasks
  where id = p_task_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'message', 'Không tìm thấy tác vụ soạn hàng.');
  end if;

  if v_task.assigned_to is not null and v_task.assigned_to != v_effective_actor then
    return jsonb_build_object('success', false, 'error_code', 'ALREADY_CLAIMED', 'message', 'Tác vụ đã được nhân viên khác nhận soạn.');
  end if;

  if v_task.status != 'released' then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_STATUS', 'message', 'Tác vụ không ở trạng thái chờ nhận soạn.');
  end if;

  update public.picking_tasks
  set assigned_to = v_effective_actor,
      status = 'accepted',
      accepted_at = coalesce(accepted_at, now()),
      updated_at = now()
  where id = p_task_id
  returning * into v_updated;

  -- Đồng thời cập nhật trạng thái đơn orders.packing_status
  update public.orders
  set packing_status = 'in_progress',
      packed_by = v_effective_actor,
      packing_started_at = coalesce(packing_started_at, now()),
      updated_at = now()
  where id = v_task.order_id;

  insert into public.picking_audit_logs (
    task_id, order_id, action, actor_id, old_state, new_state, reason
  ) values (
    p_task_id,
    v_task.order_id,
    'claim_task',
    v_effective_actor,
    to_jsonb(v_task),
    to_jsonb(v_updated),
    'Nhân viên nhận tác vụ soạn hàng'
  );

  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'id', v_updated.id,
      'status', v_updated.status,
      'assigned_to', v_updated.assigned_to,
      'accepted_at', v_updated.accepted_at
    )
  );

EXCEPTION WHEN OTHERS THEN
  return jsonb_build_object(
    'success', false,
    'error_code', 'INTERNAL_ERROR',
    'message', format('Lỗi khi nhận tác vụ soạn hàng: %s', SQLERRM)
  );
end;
$$;

-- 11. RPC: create_picking_task_on_confirm (Sinh picking task nguyên tử khi đơn được xác nhận)
-- Transaction nguyên tử: toàn bộ thực thi trong 1 block; nếu bất kỳ bước nào lỗi thì rollback toàn bộ.
create or replace function public.create_picking_task_on_confirm(
  p_order_id uuid,
  p_actor_id uuid,
  p_version integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order record;
  v_existing_task record;
  v_new_task record;
  v_item record;
  v_item_count integer := 0;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update; -- lock đơn hàng để tránh race condition

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'ORDER_NOT_FOUND', 'message', 'Không tìm thấy đơn hàng.');
  end if;

  -- Bắt buộc đơn phải ở trạng thái confirmed mới được phát hành lệnh soạn
  if v_order.status != 'confirmed' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ORDER_STATUS',
      'message', format('Đơn hàng đang ở trạng thái "%s", chỉ đơn đã xác nhận (confirmed) mới được phát hành lệnh soạn hàng.', v_order.status)
    );
  end if;

  -- Kiểm tra xem đã có task cho phiên bản này chưa (idempotency)
  select * into v_existing_task
  from public.picking_tasks
  where order_id = p_order_id and source_confirmation_version = p_version;

  if found then
    return jsonb_build_object(
      'success', true,
      'data', jsonb_build_object(
        'id', v_existing_task.id,
        'status', v_existing_task.status,
        'source_confirmation_version', v_existing_task.source_confirmation_version,
        'is_existing', true
      )
    );
  end if;

  -- Kiểm tra đơn phải có ít nhất 1 mặt hàng
  select count(*) into v_item_count
  from public.order_items
  where order_id = p_order_id and quantity > 0;

  if v_item_count = 0 then
    return jsonb_build_object('success', false, 'error_code', 'NO_ITEMS', 'message', 'Đơn hàng không có mặt hàng nào (quantity > 0) để phát hành lệnh soạn.');
  end if;

  -- Nếu có task cũ từ phiên bản trước đó đang active, đánh dấu là superseded
  update public.picking_tasks
  set status = 'superseded',
      updated_at = now()
  where order_id = p_order_id and status in ('released', 'accepted', 'picking', 'exception');

  -- Tạo picking task mới
  insert into public.picking_tasks (
    order_id,
    status,
    source_confirmation_version,
    created_at,
    updated_at
  ) values (
    p_order_id,
    'released',
    p_version,
    now(),
    now()
  ) returning * into v_new_task;

  -- Snapshot tất cả items từ order_items sang picking_task_items (nguyên tử)
  for v_item in
    select id, quantity
    from public.order_items
    where order_id = p_order_id and quantity > 0
    order by created_at asc
  loop
    insert into public.picking_task_items (
      picking_task_id,
      order_item_id,
      confirmed_qty,
      picked_qty,
      status
    ) values (
      v_new_task.id,
      v_item.id,
      v_item.quantity,
      0,
      'pending'
    );
  end loop;

  -- Cập nhật orders.packing_status về not_started (đợi kho nhận soạn)
  update public.orders
  set packing_status = 'not_started',
      packed_by = null,
      packing_started_at = null,
      packed_at = null,
      updated_at = now()
  where id = p_order_id;

  insert into public.picking_audit_logs (
    task_id, order_id, action, actor_id, old_state, new_state, reason
  ) values (
    v_new_task.id,
    p_order_id,
    'release_task',
    p_actor_id,
    null,
    to_jsonb(v_new_task),
    format('Phát hành tác vụ soạn hàng cho đơn xác nhận phiên bản %s (%s mặt hàng)', p_version, v_item_count)
  );

  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'id', v_new_task.id,
      'status', v_new_task.status,
      'source_confirmation_version', v_new_task.source_confirmation_version,
      'item_count', v_item_count,
      'is_existing', false
    )
  );

EXCEPTION WHEN OTHERS THEN
  -- Bất kỳ lỗi nào trong block này sẽ rollback toàn bộ thay đổi
  return jsonb_build_object(
    'success', false,
    'error_code', 'INTERNAL_ERROR',
    'message', format('Lỗi phát hành picking task: %s', SQLERRM)
  );
end;
$$;

-- 12. Bảng picking_task_retry_queue (Hàng đợi retry phát hành tác vụ soạn hàng, đảm bảo không mất đơn)
create table if not exists public.picking_task_retry_queue (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_id uuid references public.admin_profiles(id),
  version integer not null default 1,
  retry_count integer not null default 0,
  max_retries integer not null default 5,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  last_error text,
  next_retry_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_picking_retry_order_version unique (order_id, version)
);

create index if not exists idx_picking_retry_status on public.picking_task_retry_queue (status, next_retry_at);

-- Nhận một lô retry nguyên tử. SKIP LOCKED cho phép nhiều worker chạy song song
-- mà không xử lý trùng cùng một đơn. Job processing bị treo quá 5 phút sẽ được
-- thu hồi để worker khác tiếp tục xử lý.
create or replace function public.claim_picking_retry_batch(
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_jobs jsonb;
begin
  with candidates as (
    select q.id
    from public.picking_task_retry_queue q
    where q.retry_count < q.max_retries
      and (
        (q.status = 'pending' and q.next_retry_at <= now())
        or (q.status = 'processing' and q.updated_at < now() - interval '5 minutes')
      )
    order by q.next_retry_at asc, q.created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 20), 100))
  ), claimed as (
    update public.picking_task_retry_queue q
    set status = 'processing',
        retry_count = q.retry_count + 1,
        updated_at = now()
    from candidates c
    where q.id = c.id
    returning q.*
  )
  select coalesce(jsonb_agg(to_jsonb(claimed)), '[]'::jsonb)
  into v_jobs
  from claimed;

  return jsonb_build_object('success', true, 'data', v_jobs);
exception when others then
  return jsonb_build_object(
    'success', false,
    'error_code', 'CLAIM_RETRY_FAILED',
    'message', SQLERRM
  );
end;
$$;

-- 13. Row Level Security & Quyền truy cập
alter table public.procurement_review_requests enable row level security;
alter table public.procurement_review_items enable row level security;
alter table public.procurement_review_audit_logs enable row level security;
alter table public.picking_tasks enable row level security;
alter table public.picking_task_items enable row level security;
alter table public.picking_exceptions enable row level security;
alter table public.picking_audit_logs enable row level security;
alter table public.internal_notifications enable row level security;
alter table public.picking_task_retry_queue enable row level security;

-- RLS Policies: service_role bypass toàn bộ (Supabase backend chạy với service_role key)
create policy "service_role_all_procurement_review_requests"
  on public.procurement_review_requests to service_role using (true) with check (true);

create policy "service_role_all_procurement_review_items"
  on public.procurement_review_items to service_role using (true) with check (true);

create policy "service_role_all_procurement_review_audit_logs"
  on public.procurement_review_audit_logs to service_role using (true) with check (true);

create policy "service_role_all_picking_tasks"
  on public.picking_tasks to service_role using (true) with check (true);

create policy "service_role_all_picking_task_items"
  on public.picking_task_items to service_role using (true) with check (true);

create policy "service_role_all_picking_exceptions"
  on public.picking_exceptions to service_role using (true) with check (true);

create policy "service_role_all_picking_audit_logs"
  on public.picking_audit_logs to service_role using (true) with check (true);

create policy "service_role_all_internal_notifications"
  on public.internal_notifications to service_role using (true) with check (true);

create policy "service_role_all_picking_task_retry_queue"
  on public.picking_task_retry_queue to service_role using (true) with check (true);

-- Thu hồi toàn bộ quyền từ anon và authenticated; chỉ cho phép service_role
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.procurement_review_requests from anon;
    revoke all on public.procurement_review_items from anon;
    revoke all on public.procurement_review_audit_logs from anon;
    revoke all on public.picking_tasks from anon;
    revoke all on public.picking_task_items from anon;
    revoke all on public.picking_exceptions from anon;
    revoke all on public.picking_audit_logs from anon;
    revoke all on public.internal_notifications from anon;
    revoke all on public.picking_task_retry_queue from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.procurement_review_requests from authenticated;
    revoke all on public.procurement_review_items from authenticated;
    revoke all on public.procurement_review_audit_logs from authenticated;
    revoke all on public.picking_tasks from authenticated;
    revoke all on public.picking_task_items from authenticated;
    revoke all on public.picking_exceptions from authenticated;
    revoke all on public.picking_audit_logs from authenticated;
    revoke all on public.internal_notifications from authenticated;
    revoke all on public.picking_task_retry_queue from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on public.procurement_review_requests to service_role;
    grant all on public.procurement_review_items to service_role;
    grant all on public.procurement_review_audit_logs to service_role;
    grant all on public.picking_tasks to service_role;
    grant all on public.picking_task_items to service_role;
    grant all on public.picking_exceptions to service_role;
    grant all on public.picking_audit_logs to service_role;
    grant all on public.internal_notifications to service_role;
    grant all on public.picking_task_retry_queue to service_role;
  end if;
end $$;

-- 14. Khóa quyền thực thi toàn bộ RPC mới: thu hồi từ PUBLIC, anon, authenticated; chỉ cấp cho service_role
revoke execute on function public.claim_procurement_review(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_procurement_review(uuid, uuid) to service_role;

revoke execute on function public.claim_picking_task(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_picking_task(uuid, uuid, uuid) to service_role;

revoke execute on function public.create_picking_task_on_confirm(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.create_picking_task_on_confirm(uuid, uuid, integer) to service_role;

revoke execute on function public.claim_picking_retry_batch(integer) from public, anon, authenticated;
grant execute on function public.claim_picking_retry_batch(integer) to service_role;
