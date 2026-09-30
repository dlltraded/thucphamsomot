import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const url = process.env.SUPABASE_PRODUCTS_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_PRODUCTS_ANON_KEY;
const apiBase = process.env.UAT_API_BASE || "https://thucphamsomot.vn";
if (!url || !serviceKey || !anonKey) throw new Error("Thiếu biến môi trường Supabase cho UAT");

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const email = `uat-phase1-${suffix}@example.invalid`;
const password = `Uat-${randomBytes(12).toString("base64url")}!`;
const customerCode = `UAT-${suffix}`.slice(0, 60).toUpperCase();
const externalRef = `UAT-E2E-${suffix}`;

const created = { authUserId: null, customerId: null, assignmentId: null, orderId: null, storagePaths: [] };
const tests = [];
function record(id, ok, details, severity = "critical") {
  tests.push({ id, ok: Boolean(ok), details, severity });
  console.log(`${ok ? "PASS" : "FAIL"} ${id}: ${details}`);
}
function tomorrowVn() {
  const now = new Date(Date.now() + 7 * 3600_000);
  now.setUTCDate(now.getUTCDate() + 1);
  return now.toISOString().slice(0, 10);
}
async function api(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, options);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { status: response.status, ok: response.ok, headers: response.headers, body };
}
async function cleanup() {
  if (created.storagePaths.length) {
    await admin.storage.from("order-confirmations").remove(created.storagePaths);
  }
  if (created.orderId) await admin.from("orders").delete().eq("id", created.orderId);
  if (created.assignmentId) await admin.from("price_book_customer_assignments").delete().eq("id", created.assignmentId);
  if (created.customerId) await admin.from("vip_accounts").delete().eq("id", created.customerId);
  if (created.authUserId) {
    await admin.from("admin_profiles").delete().eq("id", created.authUserId);
    await admin.auth.admin.deleteUser(created.authUserId);
  }
}

try {
  const unauthorized = await api("/api/admin/orders");
  record("SEC-API-01", unauthorized.status === 401, `API quản trị không token trả ${unauthorized.status}`);

  const { data: general, error: generalError } = await admin.from("price_books")
    .select("id,name,version,status")
    .eq("kind", "general").eq("status", "active").limit(1).single();
  if (generalError) throw generalError;
  const { data: priceRows, error: priceError } = await admin.from("price_book_items")
    .select("product_id,price,products(id,sku,name,unit,active,min_order_qty,order_step,enforce_order_step)")
    .eq("price_book_id", general.id).gt("price", 0).limit(2);
  if (priceError || !priceRows?.length) throw priceError || new Error("Không có sản phẩm có giá chung");
  const priceRow = priceRows[0];
  const product = priceRow.products;
  record("PB-E2E-01", Boolean(product?.id && Number(priceRow.price) > 0), `Chọn ${product?.sku} giá chung ${priceRow.price}`);

  const { data: authCreated, error: authCreateError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (authCreateError || !authCreated.user) throw authCreateError || new Error("Không tạo được user UAT");
  created.authUserId = authCreated.user.id;
  const { error: profileError } = await admin.from("admin_profiles").insert({
    id: created.authUserId, email, name: "TPS1 UAT Robot", role: "admin", is_active: true,
  });
  if (profileError) throw profileError;

  const { data: customer, error: customerError } = await admin.from("vip_accounts").insert({
    partner_code: customerCode,
    phone: "0900000000",
    name: "KHÁCH HÀNG UAT TỰ ĐỘNG",
    company: "TPS1 UAT — KHÔNG PHẢI KHÁCH THẬT",
    discount_tier: "VIP0",
    credit_limit: 0,
    is_active: true,
    address: "Địa chỉ kiểm thử nội bộ TPS1",
    default_shipping_alias: "Điểm giao UAT",
    default_shipping_address: "Địa chỉ kiểm thử nội bộ TPS1",
    default_shipping_name: "Người nhận UAT",
    default_shipping_phone: "0900000000",
    verification_status: "verified",
    registration_source: "admin",
  }).select("id").single();
  if (customerError) throw customerError;
  created.customerId = customer.id;
  const { data: assignment, error: assignmentError } = await admin.from("price_book_customer_assignments").insert({
    price_book_id: general.id,
    customer_id: created.customerId,
    priority: 100,
    valid_from: new Date(Date.now() - 60_000).toISOString(),
    created_by: "uat-automation",
  }).select("id").single();
  if (assignmentError) throw assignmentError;
  created.assignmentId = assignment.id;

  const { data: loginData, error: loginError } = await anon.auth.signInWithPassword({ email, password });
  if (loginError || !loginData.session) throw loginError || new Error("Không đăng nhập được admin UAT");
  const token = loginData.session.access_token;
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  record("RBAC-E2E-01", Boolean(token), "Tài khoản Admin UAT nhận được Bearer token");

  const createBody = {
    customerId: created.customerId,
    items: [{
      productId: product.id,
      name: product.name,
      unit: product.unit || "Kg",
      quantity: 1,
      // Cố ý gửi giá sai để chứng minh API không tin giá từ trình duyệt.
      price: 1,
      note: "UAT: giữ nguyên quy cách",
    }],
    deliveryDate: tomorrowVn(),
    deliveryName: "Người nhận UAT",
    deliveryPhone: "0900000000",
    deliveryAddress: "Địa chỉ kiểm thử nội bộ TPS1",
    deliveryAlias: "Điểm giao UAT",
    externalRef,
    note: "UAT tự động — sẽ xóa sau kiểm thử",
    paymentMethod: "CREDIT",
    idempotencyKey: externalRef,
  };
  const firstCreate = await api("/api/admin/orders/create", { method: "POST", headers, body: JSON.stringify(createBody) });
  if (!firstCreate.ok) throw new Error(`Tạo đơn lỗi ${firstCreate.status}: ${JSON.stringify(firstCreate.body)}`);
  created.orderId = firstCreate.body.orderId;
  record("ORD-E2E-01", Boolean(created.orderId), `Tạo đơn ${firstCreate.body.orderCode}`);

  const retryCreate = await api("/api/admin/orders/create", { method: "POST", headers, body: JSON.stringify(createBody) });
  record("ORD-E2E-02", retryCreate.ok && retryCreate.body.orderId === created.orderId, `Retry cùng idempotency key trả orderId ${retryCreate.body?.orderId}`);

  const detail = await api(`/api/admin/orders?id=${created.orderId}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!detail.ok) throw new Error(`Không đọc được đơn UAT: ${JSON.stringify(detail.body)}`);
  const order = detail.body.order || detail.body.orders?.[0] || detail.body.data?.[0] || detail.body?.[0];
  if (!order) throw new Error(`Response chi tiết đơn không đúng contract: ${JSON.stringify(detail.body).slice(0, 800)}`);
  const item = order.order_items?.[0];
  record("ORD-E2E-03", Number(item?.unit_price) === Number(priceRow.price), `Client gửi 1đ; server lưu ${item?.unit_price}; giá chung ${priceRow.price}`);
  record("PB-SNAPSHOT-01", order.price_book_id === general.id, `order.price_book_id=${order.price_book_id || "null"}; expected=${general.id}`);
  record("PB-SNAPSHOT-02", item?.price_source && item?.min_qty_snapshot != null && item?.order_step_snapshot != null,
    `source=${item?.price_source || "null"}; min=${item?.min_qty_snapshot}; step=${item?.order_step_snapshot}`);

  const finalized = await api("/api/admin/orders", {
    method: "POST", headers,
    body: JSON.stringify({
      orderId: created.orderId,
      customerTier: "VIP0",
      pricingMode: "manual_item_price",
      orderDiscountPercent: 0,
      shippingAmount: 0,
      items: [{ itemId: item.id, quantity: Number(item.quantity), finalUnitPrice: Number(priceRow.price), note: "UAT chốt giá" }],
      verificationNote: "UAT tự động",
      pricingNote: "UAT xác nhận theo bảng giá chung",
    }),
  });
  record("FLOW-E2E-01", finalized.ok && finalized.body?.order?.status === "confirmed", `Chốt giá/PDF trả ${finalized.status}, status=${finalized.body?.order?.status}`);

  const confirmation = await api(`/api/admin/orders/document?orderId=${created.orderId}&type=order_confirmation`, { headers: { Authorization: `Bearer ${token}` } });
  record("DOC-E2E-01", confirmation.ok && confirmation.headers.get("content-type")?.includes("application/pdf") && confirmation.body.length > 1000,
    `Phiếu xác nhận ${confirmation.status}, ${confirmation.body?.length || 0} bytes`);

  const preparing = await api("/api/admin/orders", { method: "PATCH", headers, body: JSON.stringify({ orderId: created.orderId, status: "preparing", note: "UAT chuyển soạn hàng" }) });
  record("FLOW-E2E-02", preparing.ok && preparing.body?.order?.status === "preparing", `Chuyển soạn hàng: ${preparing.status}`);

  const shipping = await api("/api/admin/orders", { method: "PATCH", headers, body: JSON.stringify({
    orderId: created.orderId, status: "shipping", note: "UAT bắt đầu giao",
    delivery: { assignedDriver: "Tài xế UAT", packageWeightG: 1000, packageDimensions: "10x10x10", codCollectAmount: 0 },
  }) });
  record("FLOW-E2E-03", shipping.ok && shipping.body?.order?.status === "shipping", `Chuyển đang giao: ${shipping.status}`);

  const blockedComplete = await api("/api/admin/orders", { method: "PATCH", headers, body: JSON.stringify({ orderId: created.orderId, status: "completed" }) });
  record("DEL-E2E-01", blockedComplete.status === 409 && blockedComplete.body?.code === "delivery_not_confirmed", `Hoàn thành khi chưa xác nhận thực giao trả ${blockedComplete.status}`);

  const reconciled = await api("/api/admin/orders/reconcile-delivery", { method: "POST", headers, body: JSON.stringify({ orderId: created.orderId, full: true, note: "UAT giao đủ" }) });
  record("DEL-E2E-02", reconciled.ok, `Xác nhận thực giao trả ${reconciled.status}`);

  const completed = await api("/api/admin/orders", { method: "PATCH", headers, body: JSON.stringify({ orderId: created.orderId, status: "completed", paymentStatus: "pending", paymentMethod: "CREDIT", note: "UAT hoàn thành" }) });
  record("FLOW-E2E-04", completed.ok && completed.body?.order?.status === "completed", `Hoàn thành trả ${completed.status}; warning=${completed.body?.warning || "none"}`);

  const invoice = await api(`/api/admin/orders/document?orderId=${created.orderId}&type=invoice`, { headers: { Authorization: `Bearer ${token}` } });
  record("DOC-E2E-02", invoice.ok && invoice.headers.get("content-type")?.includes("application/pdf") && invoice.body.length > 1000,
    `Hóa đơn ${invoice.status}, ${invoice.body?.length || 0} bytes`);

  const revert = await api("/api/admin/orders", { method: "PATCH", headers, body: JSON.stringify({ orderId: created.orderId, status: "pending" }) });
  record("FLOW-E2E-05", revert.status === 409, `Đơn hoàn thành chuyển ngược bị chặn ${revert.status}`);

  const { data: documents } = await admin.from("order_documents").select("storage_path").eq("order_id", created.orderId);
  created.storagePaths = (documents || []).map((d) => d.storage_path).filter(Boolean);
} catch (error) {
  const details = error instanceof Error
    ? `${error.name}: ${error.message}`
    : (() => { try { return JSON.stringify(error); } catch { return String(error); } })();
  record("UAT-FATAL", false, details);
} finally {
  await cleanup();
  const summary = {
    generatedAt: new Date().toISOString(),
    apiBase,
    passed: tests.filter((t) => t.ok).length,
    failed: tests.filter((t) => !t.ok).length,
    criticalFailed: tests.filter((t) => !t.ok && t.severity === "critical").length,
    cleanup: { ...created, storagePaths: created.storagePaths.length },
    tests,
  };
  console.log("UAT_RESULT_JSON=" + JSON.stringify(summary));
  process.exitCode = summary.criticalFailed ? 2 : 0;
}
