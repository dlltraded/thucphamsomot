import { NextRequest } from "next/server";
import { getCustomerSupabaseAdmin } from "./customer-supabase-server";

export async function verifyAdminAuth(req: NextRequest) {
  const token = 
    req.headers.get("Authorization")?.replace("Bearer ", "") || 
    req.headers.get("X-Admin-Token");

  if (!token) {
    return { ok: false, error: "Thiếu token xác thực" };
  }

  const supabase = getCustomerSupabaseAdmin();

  // Validate via Supabase Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    // Cổng thoát khẩn cấp (break-glass): CHỈ hoạt động khi biến môi trường
    // ADMIN_TOKEN được cấu hình rõ ràng trên server. Trước đây có giá trị
    // mặc định "19871988" hardcode sẵn trong code -> bất kỳ ai cũng có thể
    // giả làm admin bằng cách gửi đúng chuỗi đó, kể cả khi .env không hề
    // cấu hình ADMIN_TOKEN. Đã gỡ bỏ giá trị mặc định này.
    const expected = process.env.ADMIN_TOKEN?.trim();
    if (expected && token === expected) {
      return { 
        ok: true, 
        user: { id: "legacy-admin" }, 
        profile: { id: "legacy-admin", role: "admin", name: "System Admin" } 
      };
    }
    return { ok: false, error: "Token không hợp lệ hoặc đã hết hạn" };
  }

  // Look up admin_profile
  const { data: profile, error: profileError } = await supabase
    .from("admin_profiles")
    .select("*")
    .eq("id", user.id)
    .eq("is_active", true)
    .single();

  if (profileError || !profile) {
    return { ok: false, error: "Tài khoản không có quyền truy cập hoặc đã bị khóa" };
  }

  return { ok: true, user, profile };
}
