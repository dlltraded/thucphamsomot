import type { NextRequest } from "next/server";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

export async function resolveCustomerApiAuth(req: NextRequest) {
  const websiteSession = parseSessionCookieValue(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  const token = websiteSession?.orderSessionToken
    || req.nextUrl.searchParams.get("sessionToken")
    || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    || "";
  if (!token) return null;
  const supabase = getCustomerSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("customer_sessions")
    .select("customer_id")
    .eq("token", token)
    .gt("expires_at", now)
    .maybeSingle();
  if (error || !data?.customer_id) return null;
  await supabase.from("customer_sessions").update({ last_used_at: now }).eq("token", token);
  return { supabase, customerId: String(data.customer_id), token, websiteSession };
}
