import { getAdminSession } from "@/lib/admin-session";
import { getAdminSupabase } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import OrderDetailClient from "./client-page";

export default async function SaleOrderDetailPage({ params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return null;

  const supabase = getAdminSupabase();
  
  // 1. Lấy thông tin đơn hàng
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!order) return notFound();

  // Kiểm tra quyền (Nếu là admin thì xem thoải mái. Nếu là sale thì phải kiểm tra customer.assigned_to)
  if (session.role !== "admin") {
    const { data: customer } = await supabase
      .from("vip_accounts")
      .select("assigned_to")
      .eq("id", order.customer_id)
      .single();
    
    if (!customer || customer.assigned_to !== session.id) {
      return (
        <div className="p-8 text-center text-red-500 font-medium bg-red-50 rounded-2xl">
          Bạn không có quyền truy cập đơn hàng của khách hàng này.
        </div>
      );
    }
  }

  // 2. Lấy thông tin order items
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", params.id);

  // 3. Lấy thông tin khách hàng
  const { data: customer } = await supabase
    .from("vip_accounts")
    .select("*")
    .eq("id", order.customer_id)
    .single();

  return (
    <OrderDetailClient 
      initialOrder={order} 
      initialItems={items || []} 
      customer={customer} 
      isAdmin={session.role === "admin"}
    />
  );
}
