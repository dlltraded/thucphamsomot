import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";
import type { CustomerSession } from "@/lib/customer-session";

export async function loadCustomerSessionByToken(
  orderSessionToken: string
): Promise<CustomerSession | null> {
  const supabase = getCustomerSupabaseAdmin();
  const now = new Date().toISOString();
  const { data: session, error: sessionError } = await supabase
    .from("customer_sessions")
    .select("customer_id")
    .eq("token", orderSessionToken)
    .gt("expires_at", now)
    .maybeSingle();
  if (sessionError || !session) return null;

  const { data: account, error: accountError } = await supabase
    .from("vip_accounts")
    .select(
      "id, partner_code, name, phone, company, email, tax_code, address, default_shipping_alias, default_shipping_address, default_shipping_name, default_shipping_phone, discount_tier, verification_status, must_change_password, is_active"
    )
    .eq("id", session.customer_id)
    .eq("is_active", true)
    .maybeSingle();
  if (accountError || !account) return null;

  const { data: tier } = await supabase
    .from("customer_tiers")
    .select("discount_percent")
    .eq("code", account.discount_tier)
    .maybeSingle();

  await supabase
    .from("customer_sessions")
    .update({ last_used_at: now })
    .eq("token", orderSessionToken);

  return {
    id: account.id,
    code: account.partner_code,
    name: account.name,
    phone: account.phone,
    company: account.company || "",
    email: account.email || "",
    taxCode: account.tax_code || "",
    address: account.address || "",
    defaultShippingAddress: {
      alias: account.default_shipping_alias || "Địa chỉ mặc định",
      address: account.default_shipping_address || account.address || "",
      name: account.default_shipping_name || account.name,
      phone: account.default_shipping_phone || account.phone,
    },
    tier: account.discount_tier || "VIP0",
    discountPercent: Number(tier?.discount_percent || 0),
    verificationStatus:
      account.verification_status === "verified" || account.verification_status === "rejected"
        ? account.verification_status
        : "pending",
    mustChangePassword: Boolean(account.must_change_password),
    orderSessionToken,
  };
}
