type SupabaseAdmin = any;

export type OrderPricingInput = {
  productId: string;
  quantity: number;
};

export type ResolvedOrderPrice = {
  productId: string;
  price: number;
  generalPrice: number | null;
  assignedPrice: number | null;
  priceSource: "customer_price_book" | "group_price_book" | "general_fallback" | "general_price_book" | "missing";
  priceBookId: string | null;
  priceBookVersion: number | null;
  unitSnapshot: string;
  packagingNote: string | null;
  minQtySnapshot: number;
  orderStepSnapshot: number;
};

function isActiveAt(
  row: {
    valid_from?: string | null;
    valid_to?: string | null;
    effective_from?: string | null;
    effective_to?: string | null;
  },
  now: number,
) {
  const from = row.valid_from ?? row.effective_from;
  const to = row.valid_to ?? row.effective_to;
  if (from && new Date(from).getTime() > now) return false;
  if (to && new Date(to).getTime() < now) return false;
  return true;
}

function sortAssignments<T extends { price_book_id: string; priority?: number | null; created_at?: string | null }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const priority = Number(b.priority || 0) - Number(a.priority || 0);
    if (priority) return priority;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
}

function quantityError(quantity: number, minimum: number, step: number, enforce: boolean) {
  if (!(quantity > 0)) return "Số lượng phải lớn hơn 0";
  if (!enforce) return null;
  if (quantity + 1e-9 < minimum) return `Số lượng tối thiểu là ${minimum}`;
  const units = (quantity - minimum) / step;
  if (Math.abs(units - Math.round(units)) > 1e-7) {
    return `Số lượng phải từ ${minimum} và tăng theo bước ${step}`;
  }
  return null;
}

export async function resolveOrderPriceBook(
  supabase: SupabaseAdmin,
  customerId: string,
  inputs: OrderPricingInput[],
) {
  const productIds = [...new Set(inputs.map((row) => row.productId).filter(Boolean))];
  if (!productIds.length) throw new Error("Đơn hàng không có mã sản phẩm hợp lệ");

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const { data: customer, error: customerError } = await supabase
    .from("vip_accounts")
    .select("id, customer_group")
    .eq("id", customerId)
    .maybeSingle();
  if (customerError || !customer) throw customerError || new Error("Không tìm thấy khách hàng để áp bảng giá");

  const { data: bookRows, error: bookError } = await supabase
    .from("price_books")
    .select("id, kind, status, version, valid_from, valid_to, created_at")
    .eq("status", "active");
  if (bookError) throw bookError;
  const books = (bookRows || []).filter((book: any) => isActiveAt(book, now));
  const bookMap = new Map(books.map((book: any) => [book.id, book]));

  const { data: directRows, error: directError } = await supabase
    .from("price_book_customer_assignments")
    .select("price_book_id, priority, valid_from, valid_to, created_at")
    .eq("customer_id", customerId);
  if (directError) throw directError;
  const direct = sortAssignments((directRows || []).filter((row: any) => bookMap.has(row.price_book_id) && isActiveAt(row, now)));

  let group: any[] = [];
  if (customer.customer_group) {
    const groupResult = await supabase
      .from("price_book_customer_group_assignments")
      .select("price_book_id, priority, valid_from, valid_to, created_at")
      .ilike("group_name", customer.customer_group);
    if (!groupResult.error) {
      group = sortAssignments((groupResult.data || []).filter((row: any) => bookMap.has(row.price_book_id) && isActiveAt(row, now)));
    }
  }
  const general = books
    .filter((book: any) => book.kind === "general")
    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const candidateIds = [...new Set([
    ...direct.map((row: any) => row.price_book_id),
    ...group.map((row: any) => row.price_book_id),
    ...general.map((row: any) => row.id),
  ])];
  if (!candidateIds.length) throw new Error("Chưa có bảng giá đang áp dụng");

  const { data: itemRows, error: itemError } = await supabase
    .from("price_book_items")
    .select("price_book_id, product_id, price, effective_from, effective_to")
    .in("price_book_id", candidateIds)
    .in("product_id", productIds);
  if (itemError) throw itemError;
  const priceItems = (itemRows || []).filter((row: any) => isActiveAt(row, now));
  const itemByKey = new Map(priceItems.map((row: any) => [`${row.price_book_id}:${row.product_id}`, row]));

  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id, sku, name, unit, active, packaging_note, min_order_qty, order_step, enforce_order_step")
    .in("id", productIds)
    .eq("active", true);
  if (productError) throw productError;
  const productMap = new Map((products || []).map((product: any) => [product.id, product]));

  const errors: string[] = [];
  const resolved: ResolvedOrderPrice[] = [];
  const generalBook = general[0] || null;
  for (const input of inputs) {
    const product: any = productMap.get(input.productId);
    if (!product) {
      errors.push(`Không tìm thấy sản phẩm ${input.productId}`);
      continue;
    }
    const minimum = Math.max(0, Number(product.min_order_qty) || 1);
    const step = Math.max(0.000001, Number(product.order_step) || 1);
    const qtyIssue = quantityError(Number(input.quantity), minimum, step, Boolean(product.enforce_order_step));
    if (qtyIssue) errors.push(`${product.name}: ${qtyIssue}`);

    const generalItem: any = generalBook ? itemByKey.get(`${generalBook.id}:${input.productId}`) : null;
    let selected: any = null;
    let source: ResolvedOrderPrice["priceSource"] = "missing";
    for (const assignment of direct) {
      const row = itemByKey.get(`${assignment.price_book_id}:${input.productId}`);
      if (row) { selected = row; source = "customer_price_book"; break; }
    }
    if (!selected) {
      for (const assignment of group) {
        const row = itemByKey.get(`${assignment.price_book_id}:${input.productId}`);
        if (row) { selected = row; source = "group_price_book"; break; }
      }
    }
    if (!selected && generalItem) {
      selected = generalItem;
      source = direct.length || group.length ? "general_fallback" : "general_price_book";
    }
    const selectedBook: any = selected ? bookMap.get(selected.price_book_id) : null;
    resolved.push({
      productId: input.productId,
      price: selected ? Number(selected.price) || 0 : 0,
      generalPrice: generalItem ? Number(generalItem.price) || 0 : null,
      assignedPrice: source === "customer_price_book" || source === "group_price_book" ? Number(selected.price) || 0 : null,
      priceSource: source,
      priceBookId: selected?.price_book_id || null,
      priceBookVersion: selectedBook ? Number(selectedBook.version) || 1 : null,
      unitSnapshot: product.unit || "Kg",
      packagingNote: product.packaging_note || null,
      minQtySnapshot: minimum,
      orderStepSnapshot: step,
    });
  }

  const primaryAssignment = direct[0] || group[0] || (generalBook ? { price_book_id: generalBook.id } : null);
  const primaryBook: any = primaryAssignment ? bookMap.get(primaryAssignment.price_book_id) : null;
  return {
    resolved,
    errors,
    primaryPriceBookId: primaryBook?.id || null,
    primaryPriceBookVersion: primaryBook ? Number(primaryBook.version) || 1 : null,
    customerPriceSource: direct.length ? "customer_price_book" : group.length ? "group_price_book" : "general_price_book",
    priceResolutionStatus: resolved.every((row) => row.price > 0) ? "resolved" : "pending",
    resolvedAt: nowIso,
  };
}

export async function applyOrderPricingSnapshot(
  supabase: SupabaseAdmin,
  orderId: string,
  pricing: Awaited<ReturnType<typeof resolveOrderPriceBook>>,
) {
  const { error: orderError } = await supabase.from("orders").update({
    price_book_id: pricing.primaryPriceBookId,
    price_book_version: pricing.primaryPriceBookVersion,
    price_resolution_status: pricing.priceResolutionStatus,
    customer_price_source: pricing.customerPriceSource,
  }).eq("id", orderId);
  if (orderError) throw orderError;

  const { data: orderItems, error: findError } = await supabase.from("order_items")
    .select("id, product_id, quantity")
    .eq("order_id", orderId);
  if (findError) throw findError;
  const resolvedByProduct = new Map(pricing.resolved.map((row) => [row.productId, row]));
  let subtotal = 0;
  for (const orderItem of orderItems || []) {
    const row = resolvedByProduct.get(orderItem.product_id);
    if (!row) throw new Error(`Không tìm thấy kết quả áp giá cho dòng hàng ${orderItem.product_id}`);
    const lineTotal = Math.round(Number(orderItem.quantity) * row.price);
    subtotal += lineTotal;
    const { error: updateError } = await supabase.from("order_items").update({
      base_unit_price: row.price,
      unit_price: row.price,
      line_total: lineTotal,
      general_unit_price: row.generalPrice,
      assigned_unit_price: row.assignedPrice,
      final_unit_price: row.price,
      final_line_total: lineTotal,
      price_source: row.priceSource,
      unit_snapshot: row.unitSnapshot,
      packaging_note: row.packagingNote,
      min_qty_snapshot: row.minQtySnapshot,
      order_step_snapshot: row.orderStepSnapshot,
    }).eq("id", orderItem.id);
    if (updateError) throw updateError;
  }

  const { data: updated, error: readError } = await supabase.from("orders")
    .select("shipping_amount, discount_amount")
    .eq("id", orderId)
    .single();
  if (readError) throw readError;
  const { error: totalError } = await supabase.from("orders").update({
    subtotal,
    grand_total: subtotal + Number(updated.shipping_amount || 0) - Number(updated.discount_amount || 0),
  }).eq("id", orderId);
  if (totalError) throw totalError;
}
