import type { SupabaseClient } from "@supabase/supabase-js";

type RetryJob = {
  id: string;
  order_id: string;
  actor_id: string | null;
  version: number;
  retry_count: number;
  max_retries: number;
};

const NON_RETRYABLE_CODES = new Set([
  "INVALID_ORDER_STATUS",
  "ORDER_NOT_FOUND",
  "NO_ITEMS",
]);

export async function enqueuePickingRetry(
  supabase: SupabaseClient,
  input: {
    orderId: string;
    actorId?: string | null;
    version: number;
    lastError: string;
  }
) {
  const now = new Date();
  const { error } = await supabase.from("picking_task_retry_queue").upsert(
    {
      order_id: input.orderId,
      actor_id: input.actorId || null,
      version: input.version,
      status: "pending",
      last_error: input.lastError,
      next_retry_at: new Date(now.getTime() + 60_000).toISOString(),
      updated_at: now.toISOString(),
    },
    { onConflict: "order_id,version" }
  );

  if (error) {
    throw new Error(`Không thể ghi hàng đợi lệnh soạn: ${error.message}`);
  }
}

function normalizeClaimedJobs(payload: unknown): RetryJob[] {
  if (!payload || typeof payload !== "object") return [];
  const body = payload as { success?: boolean; data?: unknown; message?: string };
  if (body.success === false) {
    throw new Error(body.message || "Không thể nhận hàng đợi lệnh soạn");
  }
  return Array.isArray(body.data) ? (body.data as RetryJob[]) : [];
}

export async function processPickingRetryQueue(
  supabase: SupabaseClient,
  limit = 20
) {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const { data, error } = await supabase.rpc("claim_picking_retry_batch", {
    p_limit: safeLimit,
  });

  if (error) {
    throw new Error(`Không thể nhận hàng đợi lệnh soạn: ${error.message}`);
  }

  const jobs = normalizeClaimedJobs(data);
  let completed = 0;
  let rescheduled = 0;
  let failed = 0;

  for (const job of jobs) {
    let errorMessage = "";
    let errorCode = "";

    try {
      const result = await supabase.rpc("create_picking_task_on_confirm", {
        p_order_id: job.order_id,
        p_actor_id: job.actor_id,
        p_version: job.version,
      });

      if (result.error) {
        errorMessage = result.error.message || "Lỗi RPC tạo lệnh soạn";
      } else if (result.data?.success !== true) {
        errorCode = result.data?.error_code || "UNKNOWN";
        errorMessage = result.data?.message || `Lỗi nghiệp vụ (${errorCode})`;
      } else {
        const { error: finishError } = await supabase
          .from("picking_task_retry_queue")
          .update({
            status: "completed",
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id)
          .eq("status", "processing");

        if (finishError) {
          throw new Error(`Đã tạo lệnh soạn nhưng không thể hoàn tất queue: ${finishError.message}`);
        }
        completed += 1;
        continue;
      }
    } catch (jobError: any) {
      errorMessage = jobError?.message || "Lỗi không xác định khi retry lệnh soạn";
    }

    const isPermanent = NON_RETRYABLE_CODES.has(errorCode);
    const exhausted = Number(job.retry_count) >= Number(job.max_retries);
    const nextStatus = isPermanent || exhausted ? "failed" : "pending";
    const delayMinutes = Math.min(30, 2 ** Math.min(Number(job.retry_count) || 1, 5));
    const { error: releaseError } = await supabase
      .from("picking_task_retry_queue")
      .update({
        status: nextStatus,
        last_error: errorMessage,
        next_retry_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "processing");

    if (releaseError) {
      throw new Error(`Không thể cập nhật trạng thái retry ${job.id}: ${releaseError.message}`);
    }

    if (nextStatus === "failed") failed += 1;
    else rescheduled += 1;
  }

  return {
    claimed: jobs.length,
    completed,
    rescheduled,
    failed,
  };
}
