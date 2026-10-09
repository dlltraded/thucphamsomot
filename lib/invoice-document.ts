import { createHash } from "node:crypto";
import { getCustomerSupabaseAdmin } from "./customer-supabase-server";
import { generateSalesInvoicePdf, type SalesInvoiceSnapshot } from "./sales-invoice-pdf";

export async function generateInvoiceRevisionDocument(orderId: string, actor: string) {
  const supabase = getCustomerSupabaseAdmin();
  const { data: order, error } = await supabase.from("orders")
    .select("id, order_code, invoice_number, invoice_revision, customer_id, customer_code, customer_name, customer_phone, customer_company, delivery_name, delivery_phone, delivery_address, note, subtotal, discount_amount, shipping_amount, tax_amount, grand_total, paid_amount, debt_amount, completed_at, sales_rep_id, order_items(id, sku, name, unit, quantity, unit_price, line_total, vat_rate, vat_amount)")
    .eq("id", orderId).single();
  if (error || !order) throw error || new Error("Không tìm thấy hóa đơn");

  const [{ data: customer }, { data: rep }] = await Promise.all([
    supabase.from("vip_accounts").select("tax_code").eq("id", order.customer_id).maybeSingle(),
    order.sales_rep_id
      ? supabase.from("admin_profiles").select("name").eq("id", order.sales_rep_id).maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null }),
  ]);
  const revision = Math.max(1, Number(order.invoice_revision) || 1);
  const snapshot: SalesInvoiceSnapshot = {
    ...order,
    customer_tax_code: customer?.tax_code || null,
    sales_rep_name: rep?.name || null,
    subtotal: Number(order.subtotal) || 0,
    discount_amount: Number(order.discount_amount) || 0,
    shipping_amount: Number(order.shipping_amount) || 0,
    tax_amount: Number(order.tax_amount) || 0,
    grand_total: Number(order.grand_total) || 0,
    paid_amount: Number(order.paid_amount) || 0,
    debt_amount: Number(order.debt_amount) || 0,
    order_items: (order.order_items || []) as any,
  };
  const fileName = `HOA-DON_${order.invoice_number || order.order_code}_L${revision}.pdf`;
  const storagePath = `${order.id}/${fileName}`;
  const pdf = await generateSalesInvoicePdf(snapshot);
  const fileHash = createHash("sha256").update(pdf).digest("hex");
  const { error: uploadError } = await supabase.storage.from("order-confirmations")
    .upload(storagePath, pdf, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw uploadError;
  const { error: documentError } = await supabase.from("order_documents").upsert({
    order_id: order.id,
    document_type: "invoice",
    revision,
    storage_path: storagePath,
    file_hash: fileHash,
    snapshot,
    status: "generated",
    generated_by: actor,
    generated_at: new Date().toISOString(),
  }, { onConflict: "order_id,document_type,revision" });
  if (documentError) throw documentError;
  await supabase.from("orders").update({ invoice_document_status: "generated" }).eq("id", order.id);
  return { fileName, revision, storagePath };
}
