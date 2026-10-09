import type { SupabaseClient } from "@supabase/supabase-js";

type StaffProfile = {
  id?: string | null;
  role?: string | null;
  position?: string | null;
  department_id?: string | null;
  departments?: { function_group?: string | null } | { function_group?: string | null }[] | null;
  name?: string | null;
  email?: string | null;
};

function departmentGroup(profile: StaffProfile) {
  const raw = profile.departments;
  const department = Array.isArray(raw) ? raw[0] : raw;
  return department?.function_group || null;
}
export function isAccounting(profile: StaffProfile) {
  return profile.role === "ke_toan" || departmentGroup(profile) === "accounting";
}

export async function assertInvoiceWriteAccess(
  supabase: SupabaseClient,
  profile: StaffProfile,
  orderId: string
) {
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, status, invoice_number, operations_department_id")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order || order.status !== "completed" || !order.invoice_number) {
    throw new Error("Chỉ được thao tác trên hóa đơn đã hoàn thành");
  }

  if (profile.role === "admin" || isAccounting(profile)) return order;
  const isOperationsHead = profile.position === "truong_phong" && departmentGroup(profile) === "operations";
  if (!isOperationsHead || !profile.department_id || order.operations_department_id !== profile.department_id) {
    throw new Error("Hóa đơn không thuộc phòng Vận hành anh/chị phụ trách");
  }
  return order;
}

export function actorIdentity(profile: StaffProfile) {
  const id = profile.id && profile.id !== "legacy-admin" ? profile.id : null;
  return {
    id,
    name: profile.name || profile.email || "Quản trị hệ thống",
    role: profile.role || "",
    departmentId: profile.department_id || null,
  };
}
