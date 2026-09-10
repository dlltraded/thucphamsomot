import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getCustomerSupabaseAdmin } from "@/lib/customer-supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

const CAN_EDIT_ROLES = new Set(["admin", "thu_mua"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Upload ảnh sản phẩm lên Storage bucket "product-images" (public, đã có sẵn
// — dùng chung với ảnh KiotViet đồng bộ). Trả về URL công khai để lưu thẳng
// vào products.image_url — KHÔNG lưu path tương đối để tránh nhầm tên bucket
// như getImgUrl() cũ ở PosCreatePage từng giả định sai tên "products".
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  if (!CAN_EDIT_ROLES.has(auth.profile?.role || "")) {
    return json({ ok: false, error: "Chỉ Quản trị viên hoặc Thu mua được sửa ảnh sản phẩm" }, 403);
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  const productId = formData?.get("productId");
  if (!(file instanceof File) || typeof productId !== "string" || !productId) {
    return json({ ok: false, error: "Thiếu file ảnh hoặc productId" }, 400);
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return json({ ok: false, error: "Chỉ nhận ảnh JPG, PNG hoặc WEBP" }, 400);
  }
  if (file.size > MAX_SIZE) {
    return json({ ok: false, error: "Ảnh không được vượt quá 5MB" }, 400);
  }

  try {
    const supabase = getCustomerSupabaseAdmin();
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `products/${productId}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, buffer, { contentType: file.type, upsert: true });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(path);
    const imageUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase.from("products").update({ image_url: imageUrl }).eq("id", productId);
    if (updateError) throw updateError;

    return json({ ok: true, imageUrl });
  } catch (error) {
    console.error("Upload ảnh sản phẩm lỗi:", error);
    return json({ ok: false, error: "Không tải ảnh lên được" }, 500);
  }
}
