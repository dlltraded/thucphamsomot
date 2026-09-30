import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  const values = {};
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return values;
}

const env = fs.existsSync(".env")
  ? loadEnv(".env")
  : {
      SUPABASE_PRODUCTS_URL: process.env.SUPABASE_PRODUCTS_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
const sb = createClient(env.SUPABASE_PRODUCTS_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = [];
function check(id, ok, details, severity = "critical") {
  results.push({ id, ok: Boolean(ok), details, severity });
}

async function count(table, configure = (query) => query) {
  const query = configure(sb.from(table).select("*", { count: "exact", head: true }));
  const { count: value, error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  return value ?? 0;
}

async function main() {
  const [
    activeProducts,
    activeProductsWithStep,
    activeCustomers,
    customersWithPhone,
    customersWithAddress,
    activeStaff,
    openOrders,
  ] = await Promise.all([
    count("products", (q) => q.eq("active", true)),
    count("products", (q) => q.eq("active", true).eq("enforce_order_step", true)),
    count("vip_accounts", (q) => q.eq("is_active", true)),
    count("vip_accounts", (q) => q.eq("is_active", true).not("phone", "is", null).neq("phone", "")),
    count("vip_accounts", (q) => q.eq("is_active", true).or("default_shipping_address.not.is.null,address.not.is.null")),
    count("admin_profiles", (q) => q.eq("is_active", true)),
    count("orders", (q) => q.in("status", ["pending", "confirmed", "preparing", "shipping"])),
  ]);

  const { data: priceBooks, error: pbError } = await sb
    .from("price_books")
    .select("id, code, name, kind, status, valid_from, valid_to");
  if (pbError) throw pbError;
  const activeBooks = (priceBooks ?? []).filter((b) => b.status === "active");

  const activeBookIds = activeBooks.map((b) => b.id);
  let activePriceItems = 0;
  let zeroActivePrices = 0;
  if (activeBookIds.length) {
    activePriceItems = await count("price_book_items", (q) => q.in("price_book_id", activeBookIds));
    zeroActivePrices = await count("price_book_items", (q) => q.in("price_book_id", activeBookIds).lte("price", 0));
  }

  const directAssignments = await count("price_book_customer_assignments");
  let groupAssignments = 0;
  try {
    groupAssignments = await count("price_book_customer_group_assignments");
  } catch {
    // Group assignment is a later optional migration; report zero when absent.
  }

  const { data: staff, error: staffError } = await sb
    .from("admin_profiles")
    .select("role, department_id, is_active")
    .eq("is_active", true);
  if (staffError) throw staffError;
  const roleCounts = (staff ?? []).reduce((acc, row) => {
    acc[row.role] = (acc[row.role] ?? 0) + 1;
    return acc;
  }, {});
  const staffWithoutDepartment = (staff ?? []).filter((s) => !s.department_id).length;

  check("DATA-01", activeProducts > 0, `${activeProducts} sản phẩm active`);
  check("DATA-02", activeProductsWithStep > 0, `${activeProductsWithStep}/${activeProducts} sản phẩm bật kiểm tra quy cách`);
  check("PB-01", activeBooks.length > 0, `${activeBooks.length} bảng giá active: ${activeBooks.map((b) => b.name).join(" | ")}`);
  check("PB-02", activePriceItems > 0 && zeroActivePrices === 0, `${activePriceItems} dòng giá active; ${zeroActivePrices} dòng giá <= 0`);
  check("PB-03", directAssignments + groupAssignments > 0, `${directAssignments} gán trực tiếp; ${groupAssignments} gán nhóm`);
  check("CUS-01", activeCustomers > 0, `${activeCustomers} khách active`);
  check("CUS-02", customersWithPhone === activeCustomers, `${customersWithPhone}/${activeCustomers} khách có SĐT`, "pilot");
  check("CUS-03", customersWithAddress === activeCustomers, `${customersWithAddress}/${activeCustomers} khách có địa chỉ`, "pilot");
  check("RBAC-01", activeStaff > 0, `${activeStaff} nhân viên active; roles=${JSON.stringify(roleCounts)}`);
  check("RBAC-02", staffWithoutDepartment === 0, `${staffWithoutDepartment}/${activeStaff} nhân viên chưa gán phòng`, "pilot");
  check("ORD-BASE", true, `${openOrders} đơn đang mở trước UAT`, "info");

  const output = {
    generatedAt: new Date().toISOString(),
    summary: {
      passed: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      criticalFailed: results.filter((r) => !r.ok && r.severity === "critical").length,
    },
    results,
  };
  console.log(JSON.stringify(output, null, 2));
  process.exitCode = output.summary.criticalFailed ? 2 : 0;
}

main().catch((error) => {
  console.error(JSON.stringify({ fatal: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
});
