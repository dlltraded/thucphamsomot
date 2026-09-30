import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const url = process.env.SUPABASE_PRODUCTS_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_PRODUCTS_ANON_KEY;
const apiBase = process.env.UAT_API_BASE || "https://thucphamsomot.vn";
if (!url || !serviceKey || !anonKey) throw new Error("Thiếu biến môi trường UAT");
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const fixture = { authId: null, customerId: null, assignmentId: null, sourceIds: [], mergedId: null };
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
async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = response.headers.get("content-type") || "";
  const payload = type.includes("application/json") ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { ok: response.ok, status: response.status, body: payload, type };
}
async function cleanup() {
  const ids = [...fixture.sourceIds, fixture.mergedId].filter(Boolean);
  if (ids.length) await db.from("orders").delete().in("id", ids);
  if (fixture.assignmentId) await db.from("price_book_customer_assignments").delete().eq("id", fixture.assignmentId);
  if (fixture.customerId) await db.from("vip_accounts").delete().eq("id", fixture.customerId);
  if (fixture.authId) {
    await db.from("admin_profiles").delete().eq("id", fixture.authId);
    await db.auth.admin.deleteUser(fixture.authId);
  }
}

try {
  const { data: general, error: generalError } = await db.from("price_books")
    .select("id").eq("kind", "general").eq("status", "active").limit(1).single();
  if (generalError) throw generalError;
  const { data: priceRows, error: priceError } = await db.from("price_book_items")
    .select("product_id,price,products(id,name,unit,active)").eq("price_book_id", general.id).gt("price", 0).limit(1);
  if (priceError || !priceRows?.[0]?.products) throw priceError || new Error("Thiếu sản phẩm giá chung");
  const product = priceRows[0].products;

  const email = `uat-merge-${suffix}@example.invalid`;
  const password = `Uat-${randomBytes(12).toString("base64url")}!`;
  const { data: authData, error: authError } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (authError || !authData.user) throw authError || new Error("Không tạo được admin UAT");
  fixture.authId = authData.user.id;
  const { error: profileError } = await db.from("admin_profiles").insert({ id: fixture.authId, email, name: "TPS1 UAT Merge", role: "admin", is_active: true });
  if (profileError) throw profileError;
  const { data: customer, error: customerError } = await db.from("vip_accounts").insert({
    partner_code: `TPS1-UATM-${suffix}`.slice(0, 60).toUpperCase(), phone: "0900000002",
    name: "KHÁCH UAT GỘP ĐƠN", company: "TPS1 UAT — KHÔNG PHẢI KHÁCH THẬT",
    discount_tier: "VIP0", is_active: true, address: "Địa chỉ UAT gộp đơn",
    default_shipping_alias: "Điểm giao UAT", default_shipping_address: "Địa chỉ UAT gộp đơn",
    default_shipping_name: "Người nhận UAT", default_shipping_phone: "0900000002",
    verification_status: "verified", registration_source: "admin",
  }).select("id").single();
  if (customerError) throw customerError;
  fixture.customerId = customer.id;
  const { data: assignment, error: assignmentError } = await db.from("price_book_customer_assignments").insert({
    price_book_id: general.id, customer_id: customer.id, priority: 100,
    valid_from: new Date(Date.now() - 60_000).toISOString(), created_by: "uat-automation",
  }).select("id").single();
  if (assignmentError) throw assignmentError;
  fixture.assignmentId = assignment.id;
  const { data: login, error: loginError } = await anon.auth.signInWithPassword({ email, password });
  if (loginError || !login.session) throw loginError || new Error("Không đăng nhập được admin UAT");
  const token = login.session.access_token;

  const createBase = {
    customerId: customer.id, deliveryDate: tomorrowVn(), deliveryName: "Người nhận UAT",
    deliveryPhone: "0900000002", deliveryAddress: "Địa chỉ UAT gộp đơn", deliveryAlias: "Điểm giao UAT",
    paymentMethod: "CREDIT", note: "UAT gộp đơn — tự động xóa",
  };
  for (const [index, quantity] of [1, 2].entries()) {
    const result = await request("/api/admin/orders/create", { method: "POST", token, body: {
      ...createBase, externalRef: `UAT-MERGE-${suffix}-${index + 1}`, idempotencyKey: `UAT-MERGE-${suffix}-${index + 1}`,
      items: [{ productId: product.id, name: product.name, unit: product.unit || "Kg", quantity, price: 1 }],
    } });
    if (!result.ok) throw new Error(`Tạo đơn nguồn ${index + 1} lỗi ${result.status}: ${JSON.stringify(result.body)}`);
    fixture.sourceIds.push(result.body.orderId);
  }
  record("MERGE-UAT-01", fixture.sourceIds.length === 2, `Đã tạo 2 đơn nguồn ${fixture.sourceIds.join(", ")}`);

  const preview = await request("/api/admin/orders/merge/preview", { method: "POST", token, body: { orderIds: fixture.sourceIds } });
  record("MERGE-UAT-02", preview.ok && preview.body?.eligible && preview.body?.previewToken, `Preview ${preview.status}; eligible=${preview.body?.eligible}; items ${preview.body?.itemsBeforeCount}→${preview.body?.itemsAfterCount}`);
  if (!preview.body?.previewToken) throw new Error(`Không có preview token: ${JSON.stringify(preview.body)}`);

  const mergeKey = `uat-merge-commit-${suffix}`;
  const committed = await request("/api/admin/orders/merge/commit", { method: "POST", token, body: {
    orderIds: fixture.sourceIds, previewToken: preview.body.previewToken, idempotencyKey: mergeKey,
    reason: "UAT kiểm tra gộp và xóa đơn nguồn", note: "Dữ liệu UAT sẽ được xóa",
  } });
  fixture.mergedId = committed.body?.order?.id || null;
  record("MERGE-UAT-03", committed.ok && committed.body?.deletedSourceCount === 2 && fixture.mergedId,
    `Commit ${committed.status}; deleted=${committed.body?.deletedSourceCount}; merged=${fixture.mergedId}`);

  const { count: sourceCount } = await db.from("orders").select("id", { count: "exact", head: true }).in("id", fixture.sourceIds);
  const { data: merged } = await db.from("orders").select("id,item_count,subtotal,price_book_id,order_items(quantity,unit_price,line_total)").eq("id", fixture.mergedId).single();
  record("MERGE-UAT-04", sourceCount === 0, `Số đơn nguồn còn trong orders=${sourceCount}`);
  record("MERGE-UAT-05", Number(merged?.order_items?.[0]?.quantity) === 3,
    `Đơn gộp có SL=${merged?.order_items?.[0]?.quantity}; item_count=${merged?.item_count}; subtotal=${merged?.subtotal}`);

  const retry = await request("/api/admin/orders/merge/commit", { method: "POST", token, body: {
    orderIds: fixture.sourceIds, previewToken: preview.body.previewToken, idempotencyKey: mergeKey,
    reason: "UAT retry", note: "UAT retry",
  } });
  record("MERGE-UAT-06", retry.ok && retry.body?.alreadyProcessed === true && retry.body?.order?.id === fixture.mergedId,
    `Retry ${retry.status}; alreadyProcessed=${retry.body?.alreadyProcessed}; merged=${retry.body?.order?.id}`);

  const packing = await request(`/api/admin/reports/packing-list/export?orderIds=${fixture.mergedId}`, { token });
  record("EXPORT-UAT-01", packing.ok && packing.type.includes("spreadsheetml") && packing.body.length > 1000,
    `File soạn hàng ${packing.status}; ${packing.body?.length || 0} bytes; ${packing.type}`);
} catch (error) {
  let details;
  if (error instanceof Error) details = `${error.name}: ${error.message}`;
  else { try { details = JSON.stringify(error); } catch { details = String(error); } }
  record("UAT-MERGE-FATAL", false, details);
} finally {
  await cleanup();
  const summary = { generatedAt: new Date().toISOString(), apiBase, passed: tests.filter((t) => t.ok).length,
    failed: tests.filter((t) => !t.ok).length, fixture: { ...fixture, sourceIds: fixture.sourceIds.length }, tests };
  console.log("UAT_MERGE_RESULT_JSON=" + JSON.stringify(summary));
  process.exitCode = summary.failed ? 2 : 0;
}
