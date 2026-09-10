import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { CUSTOMER_SESSION_COOKIE, parseSessionCookieValue } from "@/lib/customer-session";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

async function resolveCustomerId(req: NextRequest, supabase: ReturnType<typeof getCustomerSupabaseAdmin>, tokenFromForm?: string) {
  const websiteSession = parseSessionCookieValue(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  const token = tokenFromForm || websiteSession?.orderSessionToken || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await supabase
    .from("customer_sessions")
    .select("customer_id, expires_at")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return data?.customer_id || null;
}

// Giai đoạn E, mục 9 — khách tải file mẫu để đặt hàng loạt.
export async function GET() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Tên hoặc Mã hàng", "Số lượng", "Ghi chú"],
    ["VD: Bắp chuối nguyên cái", 5, ""],
  ]);
  ws["!cols"] = [{ wch: 32 }, { wch: 10 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, "Dat hang");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-dat-hang.xlsx"',
    },
  });
}

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ|Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Trigram Dice coefficient — đo độ giống nhau giữa 2 chuỗi đã chuẩn hóa, đủ
// tốt để gợi ý "gần đúng" mà không cần bật extension pg_trgm trong Postgres
// (giữ mọi thứ chạy được ngay, không cần thêm migration cho tính năng này).
function trigrams(s: string) {
  const padded = `  ${s} `;
  const grams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) grams.add(padded.slice(i, i + 3));
  return grams;
}
function similarityFromGrams(ga: Set<string>, gb: Set<string>) {
  if (ga.size === 0 || gb.size === 0) return 0;
  let overlap = 0;
  for (const g of ga) if (gb.has(g)) overlap++;
  return (2 * overlap) / (ga.size + gb.size);
}

interface MatchResult {
  row: number;
  input: string;
  quantity: number;
  note: string;
  status: "matched" | "ambiguous" | "not_found" | "invalid_quantity";
  product?: { id: string; sku: string; name: string; unit: string; price: number };
  suggestions?: { id: string; sku: string; name: string; unit: string; price: number; score: number }[];
}

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  const tokenFromForm = formData?.get("token");

  const supabase = getCustomerSupabaseAdmin();
  const customerId = await resolveCustomerId(req, supabase, typeof tokenFromForm === "string" ? tokenFromForm : undefined);
  if (!customerId) return json({ ok: false, error: "Vui lòng đăng nhập lại" }, 401);

  if (!(file instanceof File)) return json({ ok: false, error: "Thiếu file Excel" }, 400);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: null });
    if (rows.length === 0) return json({ ok: false, error: "File không có dữ liệu" }, 400);
    if (rows.length > 300) return json({ ok: false, error: "File quá nhiều dòng (tối đa 300/lần)" }, 400);

    // Loại mã chưa có giá (price_retail/price_wholesale đều = 0, ~45% catalog
    // tính tới 2026-09-10 — thu mua chưa nhập giá sau đồng bộ KiotViet) khỏi
    // danh sách khớp, tránh khách đặt nhầm hàng chưa có giá thật.
    const { data: products, error } = await supabase
      .from("products")
      .select("id, sku, name, unit, price_retail, price_wholesale")
      .eq("active", true)
      .or("price_retail.gt.0,price_wholesale.gt.0");
    if (error) throw error;

    // Tính giá cho TẤT CẢ sản phẩm 1 lần trong bộ nhớ (thay vì gọi RPC
    // resolve_product_price cho từng dòng/gợi ý — với file tới 300 dòng x 3
    // gợi ý sẽ ra hàng trăm round-trip DB tuần tự, dễ timeout). Lấy đúng thứ
    // tự ưu tiên như hàm SQL: giá hợp đồng riêng > giá theo hạng > giá gốc.
    const [{ data: customer }, { data: contractRows }] = await Promise.all([
      supabase.from("vip_accounts").select("discount_tier").eq("id", customerId).maybeSingle(),
      supabase.from("customer_contract_prices").select("product_id, price, valid_until").eq("customer_id", customerId),
    ]);
    const tier = customer?.discount_tier || null;
    const now = new Date();
    const contractByProduct = new Map(
      (contractRows || [])
        .filter((c) => !c.valid_until || new Date(c.valid_until) > now)
        .map((c) => [c.product_id, Number(c.price)])
    );
    const { data: tierPriceRows } = tier
      ? await supabase.from("product_tier_prices").select("product_id, price").eq("tier", tier)
      : { data: [] as { product_id: string; price: number }[] };
    const tierPriceByProduct = new Map((tierPriceRows || []).map((t) => [t.product_id, Number(t.price)]));

    function priceFor(p: { id: string; price_retail: number | null; price_wholesale: number | null }) {
      if (contractByProduct.has(p.id)) return contractByProduct.get(p.id)!;
      if (tierPriceByProduct.has(p.id)) return tierPriceByProduct.get(p.id)!;
      return Number(p.price_retail) || Number(p.price_wholesale) || 0;
    }

    const bySkuLower = new Map((products || []).map((p) => [String(p.sku || "").toLowerCase(), p]));
    const byNormalizedName = new Map((products || []).map((p) => [normalize(p.name), p]));
    // Tính sẵn chuẩn hóa + trigram 1 lần cho toàn bộ sản phẩm, tránh lặp lại
    // hàng trăm nghìn lần trong vòng lặp gợi ý gần đúng bên dưới (chậm/timeout).
    const productsWithGrams = (products || []).map((p) => {
      const norm = normalize(p.name);
      return { p, norm, grams: trigrams(norm) };
    });

    const results: MatchResult[] = [];
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      const input = String(r["Tên hoặc Mã hàng"] ?? r["Mã hàng"] ?? r["Tên hàng"] ?? r["SKU"] ?? "").trim();
      const qtyRaw = r["Số lượng"] ?? r["Quantity"];
      const note = String(r["Ghi chú"] ?? r["Note"] ?? "").trim();
      const rowNum = idx + 2;
      if (!input) continue;

      const quantity = Number(qtyRaw);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        results.push({ row: rowNum, input, quantity, note, status: "invalid_quantity" });
        continue;
      }

      // 1. Khớp đúng mã hàng (SKU)
      const skuMatch = bySkuLower.get(input.toLowerCase());
      if (skuMatch) {
        results.push({
          row: rowNum, input, quantity, note, status: "matched",
          product: { id: skuMatch.id, sku: skuMatch.sku, name: skuMatch.name, unit: skuMatch.unit || "Kg", price: priceFor(skuMatch) },
        });
        continue;
      }
      // 2. Khớp đúng tên (đã chuẩn hóa)
      const nameMatch = byNormalizedName.get(normalize(input));
      if (nameMatch) {
        results.push({
          row: rowNum, input, quantity, note, status: "matched",
          product: { id: nameMatch.id, sku: nameMatch.sku, name: nameMatch.name, unit: nameMatch.unit || "Kg", price: priceFor(nameMatch) },
        });
        continue;
      }
      // 3. Gần đúng — tối đa 3 gợi ý, ngưỡng độ giống >= 0.28
      const inputGrams = trigrams(normalize(input));
      const scored = productsWithGrams
        .map(({ p, grams }) => ({ p, score: similarityFromGrams(inputGrams, grams) }))
        .filter((x) => x.score >= 0.28)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      if (scored.length > 0) {
        const suggestions = scored.map(({ p, score }) => ({
          id: p.id, sku: p.sku, name: p.name, unit: p.unit || "Kg", price: priceFor(p), score: Math.round(score * 100) / 100,
        }));
        results.push({ row: rowNum, input, quantity, note, status: "ambiguous", suggestions });
      } else {
        results.push({ row: rowNum, input, quantity, note, status: "not_found" });
      }
    }

    return json({
      ok: true,
      results,
      summary: {
        total: results.length,
        matched: results.filter((r) => r.status === "matched").length,
        ambiguous: results.filter((r) => r.status === "ambiguous").length,
        notFound: results.filter((r) => r.status === "not_found").length,
        invalidQuantity: results.filter((r) => r.status === "invalid_quantity").length,
      },
    });
  } catch (error) {
    console.error("POST /api/customer/order/import-excel lỗi:", error);
    return json({ ok: false, error: "Không đọc được file. Kiểm tra đúng định dạng mẫu chưa." }, 500);
  }
}
