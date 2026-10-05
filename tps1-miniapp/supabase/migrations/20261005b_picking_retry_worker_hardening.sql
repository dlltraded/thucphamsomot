-- G8.5 patch: hardening SECURITY DEFINER và worker retry lệnh soạn hàng.
-- Tách thành migration mới để các môi trường đã chạy migration G8 cũ vẫn nhận bản vá.

alter function public.claim_procurement_review(uuid, uuid)
  set search_path = public, pg_temp;
alter function public.claim_picking_task(uuid, uuid, uuid)
  set search_path = public, pg_temp;
alter function public.create_picking_task_on_confirm(uuid, uuid, integer)
  set search_path = public, pg_temp;

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

create index if not exists idx_picking_retry_status
  on public.picking_task_retry_queue (status, next_retry_at);

alter table public.picking_task_retry_queue enable row level security;
drop policy if exists "service_role_all_picking_task_retry_queue"
  on public.picking_task_retry_queue;
create policy "service_role_all_picking_task_retry_queue"
  on public.picking_task_retry_queue
  to service_role using (true) with check (true);

revoke all on public.picking_task_retry_queue from public, anon, authenticated;
grant all on public.picking_task_retry_queue to service_role;

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

revoke execute on function public.claim_procurement_review(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_procurement_review(uuid, uuid)
  to service_role;

revoke execute on function public.claim_picking_task(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_picking_task(uuid, uuid, uuid)
  to service_role;

revoke execute on function public.create_picking_task_on_confirm(uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.create_picking_task_on_confirm(uuid, uuid, integer)
  to service_role;

revoke execute on function public.claim_picking_retry_batch(integer)
  from public, anon, authenticated;
grant execute on function public.claim_picking_retry_batch(integer)
  to service_role;
