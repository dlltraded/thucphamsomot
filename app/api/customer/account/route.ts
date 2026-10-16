import { NextRequest, NextResponse } from "next/server";
import { resolveCustomerApiAuth } from "@/lib/customer-api-auth";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: cors });

function activeAt(row: any, now: number) {
  if (row?.valid_from && new Date(row.valid_from).getTime() > now) return false;
  if (row?.valid_to && new Date(row.valid_to).getTime() < now) return false;
  return true;
}

export async function GET(req: NextRequest) {
  const auth = await resolveCustomerApiAuth(req);
  if (!auth) return json({ ok: false, error: "Phiên đăng nhập đã hết hạn" }, 401);
  const { supabase, customerId } = auth;
  const now = Date.now();
  try {
    const [profileResult, addressesResult, recentResult, totalResult, processingResult, shippingResult, completedResult, requestResult] = await Promise.all([
      supabase.from("vip_accounts")
        .select("id, partner_code, name, phone, company, email, tax_code, address, customer_group, verification_status, is_active")
        .eq("id", customerId).single(),
      supabase.from("customer_addresses")
        .select("id, label, address, contact_name, contact_phone, is_default, is_active, created_at, updated_at")
        .eq("customer_id", customerId).eq("is_active", true)
        .order("is_default", { ascending: false }).order("created_at", { ascending: true }),
      supabase.from("orders")
        .select("id, order_code, status, grand_total, delivery_date, created_at")
        .eq("customer_id", customerId).neq("status", "merged")
        .order("created_at", { ascending: false }).limit(5),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", customerId).neq("status", "merged"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", customerId).in("status", ["draft", "pending", "confirmed", "preparing"]),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", customerId).eq("status", "shipping"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", customerId).eq("status", "completed"),
      supabase.from("customer_profile_change_requests")
        .select("id, requested_company, requested_tax_code, reason, status, created_at, review_note")
        .eq("customer_id", customerId).order("created_at", { ascending: false }).limit(5),
    ]);
    if (profileResult.error || !profileResult.data) throw profileResult.error || new Error("Không tìm thấy khách hàng");

    const profile = profileResult.data;
    const { data: activeBooks, error: bookError } = await supabase.from("price_books")
      .select("id, name, kind, status, version, valid_from, valid_to, created_at")
      .eq("status", "active");
    if (bookError) throw bookError;
    const books = (activeBooks || []).filter((row: any) => activeAt(row, now));
    const bookMap = new Map(books.map((row: any) => [row.id, row]));
    const [directResult, groupResult] = await Promise.all([
      supabase.from("price_book_customer_assignments")
        .select("price_book_id, priority, valid_from, valid_to, created_at")
        .eq("customer_id", customerId),
      profile.customer_group
        ? supabase.from("price_book_customer_group_assignments")
            .select("price_book_id, priority, valid_from, valid_to, created_at")
            .ilike("group_name", profile.customer_group)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const rank = (rows: any[]) => [...rows]
      .filter((row) => bookMap.has(row.price_book_id) && activeAt(row, now))
      .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    const direct = rank(directResult.data || []);
    const group = rank(groupResult.data || []);
    const general = books.filter((row: any) => row.kind === "general")
      .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    const selectedBook: any = bookMap.get(direct[0]?.price_book_id) || bookMap.get(group[0]?.price_book_id) || general[0] || null;

    return json({
      ok: true,
      profile: {
        id: profile.id, code: profile.partner_code, contactName: profile.name,
        phone: profile.phone || "", company: profile.company || "", email: profile.email || "",
        taxCode: profile.tax_code || "", address: profile.address || "",
        verificationStatus: profile.verification_status || "pending", isActive: Boolean(profile.is_active),
        priceBook: selectedBook ? { id: selectedBook.id, name: selectedBook.name, version: Number(selectedBook.version) || 1 } : null,
      },
      orderSummary: {
        total: totalResult.count || 0, processing: processingResult.count || 0,
        shipping: shippingResult.count || 0, completed: completedResult.count || 0,
      },
      recentOrders: recentResult.data || [],
      addresses: addressesResult.data || [],
      legalChangeRequests: requestResult.error ? [] : requestResult.data || [],
    });
  } catch (error) {
    console.error("GET /api/customer/account error:", error);
    return json({ ok: false, error: "Không tải được thông tin tài khoản" }, 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}
