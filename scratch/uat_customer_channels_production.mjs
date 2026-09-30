import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";

const url = process.env.SUPABASE_PRODUCTS_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiBase = process.env.UAT_API_BASE || "https://thucphamsomot.vn";
if (!url || !serviceKey) throw new Error("Thiếu biến môi trường Supabase cho UAT");

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const fixture = { customerId: null, sessionToken: null, assignmentId: null, productId: null, bookId: null, orderIds: [] };
const tests = [];
function record(id, ok, details) {
  tests.push({ id, ok: Boolean(ok), details });
  console.log(`${ok ? "PASS" : "FAIL"} ${id}: ${details}`);
}
function tomorrowVn() {
  const now = new Date(Date.now() + 7 * 3600_000);
  now.setUTCDate(now.getUTCDate() + 1);
  return now.toISOString().slice(0, 10);
}
async function api(body) {
  const response = await fetch(`${apiBase}/api/customer/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, ok: response.ok, body: await response.json() };
}
async function cleanup() {
  for (const orderId of fixture.orderIds) await db.from("orders").delete().eq("id", orderId);
  if (fixture.sessionToken) await db.from("customer_sessions").delete().eq("token", fixture.sessionToken);
  if (fixture.assignmentId) await db.from("price_book_customer_assignments").delete().eq("id", fixture.assignmentId);
  if (fixture.bookId && fixture.productId) {
    await db.from("price_book_items").delete().eq("price_book_id", fixture.bookId).eq("product_id", fixture.productId);
  }
  if (fixture.productId) await db.from("products").delete().eq("id", fixture.productId);
  if (fixture.customerId) await db.from("vip_accounts").delete().eq("id", fixture.customerId);
}

try {
  const { data: general, error: bookError } = await db.from("price_books")
    .select("id,version").eq("kind", "general").eq("status", "active").limit(1).single();
  if (bookError) throw bookError;
  fixture.bookId = general.id;

  const productId = randomUUID();
  const price = 12_345;
  const { error: productError } = await db.from("products").insert({
    id: productId,
    local_product_id: `uat-quycach-${suffix}`.slice(0, 120),
    sku: `UAT-QUYCACH-${suffix}`.slice(0, 80).toUpperCase(),
    name: "Sản phẩm UAT quy cách 0,5kg — tự động xóa",
    unit: "Kg",
    category: "UAT",
    active: true,
    price_retail: price,
    price_wholesale: price,
    min_order_qty: 0.5,
    order_step: 0.5,
    enforce_order_step: true,
    packaging_note: "Bịch 0,5kg",
    data_source: "kiotviet",
  });
  if (productError) throw productError;
  fixture.productId = productId;
  const { error: itemError } = await db.from("price_book_items").insert({
    price_book_id: general.id,
    product_id: productId,
    sku_snapshot: `UAT-QUYCACH-${suffix}`.slice(0, 80).toUpperCase(),
    name_snapshot: "Sản phẩm UAT quy cách 0,5kg — tự động xóa",
    unit_snapshot: "Kg",
    price,
    min_qty: 0.5,
    order_step: 0.5,
  });
  if (itemError) throw itemError;

  const { data: customer, error: customerError } = await db.from("vip_accounts").insert({
    partner_code: `TPS1-UATCH-${suffix}`.slice(0, 60).toUpperCase(),
    phone: "0900000001",
    name: "KHÁCH UAT KÊNH ĐẶT HÀNG",
    company: "TPS1 UAT — KHÔNG PHẢI KHÁCH THẬT",
    discount_tier: "VIP0",
    is_active: true,
    address: "Địa chỉ kiểm thử nội bộ TPS1",
    default_shipping_alias: "Điểm giao UAT",
    default_shipping_address: "Địa chỉ kiểm thử nội bộ TPS1",
    default_shipping_name: "Người nhận UAT",
    default_shipping_phone: "0900000001",
    verification_status: "verified",
    registration_source: "admin",
  }).select("id").single();
  if (customerError) throw customerError;
  fixture.customerId = customer.id;
  const { data: assignment, error: assignmentError } = await db.from("price_book_customer_assignments").insert({
    price_book_id: general.id, customer_id: customer.id, priority: 100,
    valid_from: new Date(Date.now() - 60_000).toISOString(), created_by: "uat-automation",
  }).select("id").single();
  if (assignmentError) throw assignmentError;
  fixture.assignmentId = assignment.id;
  const { data: session, error: sessionError } = await db.from("customer_sessions")
    .insert({ customer_id: customer.id }).select("token").single();
  if (sessionError) throw sessionError;
  fixture.sessionToken = session.token;

  const baseBody = {
    orderSessionToken: session.token,
    deliveryDate: tomorrowVn(),
    deliveryType: "shipping",
    deliveryAlias: "Điểm giao UAT",
    deliveryAddress: "Địa chỉ kiểm thử nội bộ TPS1",
    deliveryName: "Người nhận UAT",
    deliveryPhone: "0900000001",
    items: [{ productId, name: "Sản phẩm UAT quy cách 0,5kg", quantity: 0.7 }],
  };
  const wrongStep = await api({ ...baseBody, source: "website", idempotencyKey: `uat-bad-step-${suffix}` });
  record("QTY-CUSTOMER-01", wrongStep.status === 400 && wrongStep.body?.code === "INVALID_ORDER_QUANTITY", `0,7kg bị chặn ${wrongStep.status}: ${wrongStep.body?.error}`);

  const websiteKey = `uat-web-${suffix}`;
  const website = await api({
    ...baseBody, source: "website", idempotencyKey: websiteKey,
    items: [{ productId, name: "Tên giả từ client", quantity: 1 }],
  });
  if (website.body?.orderId) fixture.orderIds.push(website.body.orderId);
  record("WEB-CUSTOMER-01", website.ok && Boolean(website.body?.orderId), `Website tạo đơn ${website.status}: ${website.body?.orderCode || website.body?.error}`);
  const websiteRetry = await api({
    ...baseBody, source: "website", idempotencyKey: websiteKey,
    items: [{ productId, name: "Tên giả từ client", quantity: 1 }],
  });
  record("WEB-CUSTOMER-02", websiteRetry.ok && websiteRetry.body?.orderId === website.body?.orderId, `Website retry trả cùng orderId=${websiteRetry.body?.orderId}`);

  const zalo = await api({
    ...baseBody, source: "zalo_mini_app", idempotencyKey: `uat-zalo-${suffix}`,
    items: [{ productId, name: "Tên giả từ client", quantity: 1.5 }],
  });
  if (zalo.body?.orderId) fixture.orderIds.push(zalo.body.orderId);
  record("ZALO-CUSTOMER-01", zalo.ok && Boolean(zalo.body?.orderId), `Mini app tạo đơn ${zalo.status}: ${zalo.body?.orderCode || zalo.body?.error}`);

  const { data: stored, error: storedError } = await db.from("orders")
    .select("id,source,price_book_id,price_book_version,price_resolution_status,subtotal,grand_total,order_items(quantity,unit_price,line_total,price_source,min_qty_snapshot,order_step_snapshot)")
    .in("id", fixture.orderIds).order("source");
  if (storedError) throw storedError;
  const webOrder = stored.find((row) => row.source === "website");
  const zaloOrder = stored.find((row) => row.source === "zalo_mini_app");
  const webItem = webOrder?.order_items?.[0];
  const zaloItem = zaloOrder?.order_items?.[0];
  record("PB-CUSTOMER-01", webOrder?.price_book_id === general.id && Number(webItem?.unit_price) === price && Number(webOrder?.subtotal) === price,
    `Website: book=${webOrder?.price_book_id}; giá=${webItem?.unit_price}; tổng=${webOrder?.subtotal}`);
  record("PB-CUSTOMER-02", zaloOrder?.price_book_id === general.id && Number(zaloItem?.unit_price) === price && Number(zaloOrder?.subtotal) === Math.round(1.5 * price),
    `Zalo: book=${zaloOrder?.price_book_id}; giá=${zaloItem?.unit_price}; tổng=${zaloOrder?.subtotal}`);
  record("QTY-SNAPSHOT-01", Number(webItem?.min_qty_snapshot) === 0.5 && Number(webItem?.order_step_snapshot) === 0.5,
    `Snapshot min=${webItem?.min_qty_snapshot}; step=${webItem?.order_step_snapshot}; source=${webItem?.price_source}`);
} catch (error) {
  let details;
  if (error instanceof Error) details = `${error.name}: ${error.message}`;
  else {
    try { details = JSON.stringify(error); } catch { details = String(error); }
  }
  record("UAT-CUSTOMER-FATAL", false, details);
} finally {
  await cleanup();
  const summary = {
    generatedAt: new Date().toISOString(), apiBase,
    passed: tests.filter((test) => test.ok).length,
    failed: tests.filter((test) => !test.ok).length,
    fixture: { ...fixture, orderIds: fixture.orderIds.length }, tests,
  };
  console.log("UAT_CUSTOMER_RESULT_JSON=" + JSON.stringify(summary));
  process.exitCode = summary.failed ? 2 : 0;
}
