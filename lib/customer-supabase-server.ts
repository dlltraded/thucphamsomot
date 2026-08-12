import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase phía server dùng cho các API route /api/customer/*.
 * Trỏ cùng project Supabase mà Zalo Mini App đang dùng (bảng vip_accounts,
 * customer_tiers, quotes) — chỉ dùng anon key vì mọi thao tác nhạy cảm đều
 * đi qua RPC SECURITY DEFINER, không cần service role key.
 */
export function getCustomerSupabase() {
  const url = process.env.SUPABASE_PRODUCTS_URL;
  const key = process.env.SUPABASE_PRODUCTS_ANON_KEY;
  if (!url || !key) {
    throw new Error("Thiếu SUPABASE_PRODUCTS_URL / SUPABASE_PRODUCTS_ANON_KEY");
  }
  return createClient(url, key);
}

/** Chỉ dùng trong API Admin phía server. Tuyệt đối không đưa key này ra client. */
export function getCustomerSupabaseAdmin() {
  const url = process.env.SUPABASE_PRODUCTS_URL;
  const key =
    process.env.SUPABASE_PRODUCTS_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Thiếu SUPABASE_PRODUCTS_URL / SUPABASE_PRODUCTS_SERVICE_ROLE_KEY"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
