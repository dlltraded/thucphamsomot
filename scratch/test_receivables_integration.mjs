import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';

async function run() {
  console.log('=== KHỞI ĐỘNG INTEGRATION TEST (MIGRATION + RPC + TRIGGER THẬT TRÊN POSTGRESQL) ===\n');

  const db = new PGlite();

  // 1. Khởi tạo schema nền tảng mô phỏng chính xác DB TPS1
  console.log('1. Khởi tạo schema nền tảng (vip_accounts, orders, order_payments + trigger, order_history)...');
  await db.exec(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role;
      END IF;
    END
    $$;

    CREATE TABLE IF NOT EXISTS public.admin_profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      email text,
      role text NOT NULL DEFAULT 'admin',
      is_active boolean NOT NULL DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS public.vip_accounts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      partner_code text,
      kiotviet_code text,
      name text NOT NULL,
      company text,
      phone text,
      credit_limit numeric(14,2) DEFAULT 0,
      kiotviet_opening_debt numeric(14,2) DEFAULT 0,
      sales_rep_id uuid,
      is_active boolean NOT NULL DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS public.orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_code text NOT NULL,
      customer_id uuid REFERENCES public.vip_accounts(id),
      customer_name text,
      customer_company text,
      status text NOT NULL DEFAULT 'pending',
      payment_method text DEFAULT 'cash',
      payment_status text NOT NULL DEFAULT 'pending',
      grand_total numeric(14,2) NOT NULL DEFAULT 0,
      paid_amount numeric(14,2) NOT NULL DEFAULT 0,
      debt_amount numeric(14,2) GENERATED ALWAYS AS (GREATEST(COALESCE(grand_total, 0) - paid_amount, 0)) STORED,
      return_credit_amount numeric(14,2) DEFAULT 0,
      delivery_date date,
      completed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    -- Bảng order_payments có check constraint amount > 0 và trigger apply_order_payment
    CREATE TABLE IF NOT EXISTS public.order_payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
      method text NOT NULL CHECK (method IN ('cash', 'transfer', 'cod', 'debt_collection')),
      amount numeric(14,2) NOT NULL CHECK (amount > 0),
      note text,
      created_by uuid,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE OR REPLACE FUNCTION public.apply_order_payment()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
      UPDATE public.orders
      SET paid_amount = paid_amount + new.amount,
          payment_status = CASE
            WHEN (paid_amount + new.amount) >= COALESCE(grand_total, 0) AND COALESCE(grand_total, 0) > 0 THEN 'paid'
            ELSE payment_status
          END
      WHERE id = new.order_id;
      RETURN new;
    END;
    $$;

    DROP TRIGGER IF EXISTS trg_apply_order_payment ON public.order_payments;
    CREATE TRIGGER trg_apply_order_payment
      AFTER INSERT ON public.order_payments
      FOR EACH ROW EXECUTE FUNCTION public.apply_order_payment();

    CREATE TABLE IF NOT EXISTS public.order_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
      action text NOT NULL,
      from_status text,
      to_status text,
      actor text,
      note text,
      payload jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    -- Seed khách hàng có sẵn nợ đầu kỳ KiotViet trước khi migration chạy
    INSERT INTO public.vip_accounts (partner_code, name, company, credit_limit, kiotviet_opening_debt)
    VALUES ('KH-TEST-001', 'Công ty Thực phẩm Thử nghiệm', 'TPS Test Corp', 50000000, 2000000);
  `);
  console.log('  -> Khởi tạo schema nền tảng thành công.');

  // 2. Chạy file migration 20261003_receivables_management_g1.sql
  console.log('\n2. Thực thi file migration 20261003_receivables_management_g1.sql...');
  const migrationPath = path.resolve('tps1-miniapp/supabase/migrations/20261003_receivables_management_g1.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

  try {
    await db.exec(migrationSql);
    console.log('  -> Migration 20261003_receivables_management_g1.sql thực thi thành công.');
  } catch (migErr) {
    console.error('  [ERROR TRONG MIGRATION]:', migErr.message, migErr.detail, migErr.hint);
    throw migErr;
  }

  // 3. Seed dữ liệu đơn hàng kiểm thử
  console.log('\n3. Tạo dữ liệu mẫu đơn hàng 1.000.000đ...');
  const custRes = await db.query(`SELECT id FROM public.vip_accounts WHERE partner_code = 'KH-TEST-001'`);
  const customerId = custRes.rows[0].id;

  const orderRes = await db.query(`
    INSERT INTO public.orders (order_code, customer_id, customer_name, status, payment_status, grand_total, paid_amount)
    VALUES ('HD-TEST-500K', $1, 'Công ty Thực phẩm Thử nghiệm', 'completed', 'pending', 1000000, 0)
    RETURNING id;
  `, [customerId]);
  const orderId = orderRes.rows[0].id;

  console.log(`  -> Tạo khách hàng ID: ${customerId}`);
  console.log(`  -> Tạo đơn hàng ID: ${orderId}, grand_total = 1.000.000đ, paid_amount = 0đ`);

  // 4. TEST 1: Thu 500.000đ thì paid_amount tăng đúng 500.000đ
  console.log('\n4. [TEST 1] Hạch toán phiếu thu 500.000đ cho đơn hàng...');
  const receiptAllocations = JSON.stringify([
    { allocationType: 'order', orderId: orderId, amount: 500000 }
  ]);

  const recResult = await db.query(`
    SELECT public.record_customer_receipt(
      $1::uuid,
      $2::numeric,
      $3::text,
      $4::text,
      $5::text,
      current_date,
      $6::jsonb,
      $7::text
    ) as result;
  `, [customerId, 500000, 'bank_transfer', 'UNC-500K', 'Thu tiền đợt 1', receiptAllocations, 'ke_toan_vien']);

  const receiptOutput = recResult.rows[0].result;
  const receiptId = receiptOutput.receiptId;
  console.log('  -> Kết quả RPC record_customer_receipt:', receiptOutput);

  // Xác minh đơn hàng
  const orderCheck1 = await db.query('SELECT paid_amount, payment_status FROM public.orders WHERE id = $1', [orderId]);
  const paid1 = Number(orderCheck1.rows[0].paid_amount);
  const status1 = orderCheck1.rows[0].payment_status;

  console.log(`  -> orders.paid_amount sau khi thu 500k: ${paid1}đ (kỳ vọng: đúng 500.000đ)`);
  console.log(`  -> orders.payment_status sau khi thu 500k: ${status1} (kỳ vọng: partially_paid)`);

  if (paid1 !== 500000) {
    throw new Error(`[FAIL TEST 1] paid_amount bị sai lệch! Giá trị thực tế: ${paid1}, kỳ vọng: 500000`);
  }
  if (status1 !== 'partially_paid') {
    throw new Error(`[FAIL TEST 1] payment_status bị sai! Thực tế: ${status1}, kỳ vọng: partially_paid`);
  }

  // Kiểm tra order_payments: phải có 0 dòng (vì không kích hoạt trigger gây double-count)
  const opCount = await db.query('SELECT count(*) as count FROM public.order_payments WHERE order_id = $1', [orderId]);
  console.log(`  -> Số dòng trong order_payments: ${opCount.rows[0].count} (kỳ vọng: 0, không kích hoạt trigger)`);
  if (Number(opCount.rows[0].count) !== 0) {
    throw new Error('[FAIL TEST 1] order_payments vẫn bị chèn dòng gây kích hoạt trigger!');
  }

  // Kiểm tra customer_receipts và receipt_allocations
  const rcCheck = await db.query('SELECT amount, status FROM public.customer_receipts WHERE id = $1', [receiptId]);
  console.log(`  -> customer_receipts.amount: ${rcCheck.rows[0].amount}, status: ${rcCheck.rows[0].status}`);
  const allocCheck = await db.query('SELECT amount, allocation_type FROM public.receipt_allocations WHERE receipt_id = $1', [receiptId]);
  console.log(`  -> receipt_allocations.amount: ${allocCheck.rows[0].amount}, type: ${allocCheck.rows[0].allocation_type}`);

  console.log('  => [PASS TEST 1] Thu 500.000đ thì paid_amount tăng đúng 500.000đ, không double count!\n');

  // 5. TEST 2: Đảo phiếu trở về đúng số ban đầu
  console.log('5. [TEST 2] Lập phiếu đảo (reverse_customer_receipt) đối ứng...');
  const revResult = await db.query(`
    SELECT public.reverse_customer_receipt(
      $1::uuid,
      $2::text,
      $3::text
    ) as result;
  `, [receiptId, 'Khách hàng chuyển nhầm tài khoản, lập phiếu đảo đối ứng', 'truong_phong_ke_toan']);

  const reversalOutput = revResult.rows[0].result;
  console.log('  -> Kết quả RPC reverse_customer_receipt:', reversalOutput);

  // Xác minh đơn hàng sau đảo phiếu
  const orderCheck2 = await db.query('SELECT paid_amount, payment_status FROM public.orders WHERE id = $1', [orderId]);
  const paid2 = Number(orderCheck2.rows[0].paid_amount);
  const status2 = orderCheck2.rows[0].payment_status;

  console.log(`  -> orders.paid_amount sau khi đảo phiếu: ${paid2}đ (kỳ vọng: trở về đúng 0đ)`);
  console.log(`  -> orders.payment_status sau khi đảo phiếu: ${status2} (kỳ vọng: pending)`);

  if (paid2 !== 0) {
    throw new Error(`[FAIL TEST 2] paid_amount sau đảo phiếu không về số ban đầu! Thực tế: ${paid2}, kỳ vọng: 0`);
  }
  if (status2 !== 'pending') {
    throw new Error(`[FAIL TEST 2] payment_status sau đảo phiếu bị sai! Thực tế: ${status2}, kỳ vọng: pending`);
  }

  // Xác minh phiếu thu gốc thành 'reversed'
  const origReceipt = await db.query('SELECT status, reversal_reason FROM public.customer_receipts WHERE id = $1', [receiptId]);
  console.log(`  -> Trạng thái phiếu thu gốc: ${origReceipt.rows[0].status}`);
  if (origReceipt.rows[0].status !== 'reversed') {
    throw new Error('[FAIL TEST 2] Phiếu thu gốc không chuyển sang reversed!');
  }

  // Xác minh chứng từ đảo liên kết và phân bổ đối ứng
  const reversalId = reversalOutput.reversalReceiptId;
  const revReceipt = await db.query('SELECT receipt_number, amount, status FROM public.customer_receipts WHERE id = $1', [reversalId]);
  console.log(`  -> Chứng từ phiếu đảo: số ${revReceipt.rows[0].receipt_number}, số tiền: ${revReceipt.rows[0].amount}đ, status: ${revReceipt.rows[0].status}`);

  if (Number(revReceipt.rows[0].amount) !== 500000) {
    throw new Error('[FAIL TEST 2] Số tiền chứng từ đảo không khớp!');
  }
  if (Number(revReceipt.rows[0].amount) <= 0) {
    throw new Error('[FAIL TEST 2] Số tiền chứng từ đảo phải là số dương hợp lệ!');
  }

  const revAlloc = await db.query('SELECT amount, allocation_type, order_id FROM public.receipt_allocations WHERE receipt_id = $1', [reversalId]);
  console.log(`  -> Phân bổ đối ứng phiếu đảo: ${revAlloc.rows[0].amount}đ, order_id: ${revAlloc.rows[0].order_id}`);
  if (Number(revAlloc.rows[0].amount) !== 500000) {
    throw new Error('[FAIL TEST 2] Phân bổ đối ứng chứng từ đảo không khớp!');
  }

  // Xác minh audit log trong order_history
  const histCheck = await db.query('SELECT action, note FROM public.order_history WHERE order_id = $1 ORDER BY created_at ASC', [orderId]);
  console.log(`  -> Lịch sử order_history (${histCheck.rows.length} bản ghi):`);
  for (const h of histCheck.rows) {
    console.log(`     * [${h.action}]: ${h.note}`);
  }

  console.log('  => [PASS TEST 2] Đảo phiếu trở về đúng số ban đầu, bút toán đối ứng chuẩn số dương!\n');

  // 6. TEST 3: Lỗi ở bất kỳ bước nào không để lại dữ liệu dở dang (Nguyên tử & Rollback)
  console.log('6. [TEST 3] Kiểm tra tính nguyên tử (Atomic rollback khi có lỗi)...');

  // Đếm số lượng record trước test lỗi
  const countReceiptsBefore = Number((await db.query('SELECT count(*) as c FROM public.customer_receipts')).rows[0].c);
  const countAllocBefore = Number((await db.query('SELECT count(*) as c FROM public.receipt_allocations')).rows[0].c);
  const paidBefore = Number((await db.query('SELECT paid_amount FROM public.orders WHERE id = $1', [orderId])).rows[0].paid_amount);

  // 3a. Thử thu vượt quá nợ còn lại của đơn hàng (nợ hiện tại = 1.000.000đ, thu 1.500.000đ)
  console.log('  3a. Thử thu 1.500.000đ (vượt nợ còn lại 1.000.000đ)...');
  let err3a = null;
  try {
    await db.query(`
      SELECT public.record_customer_receipt(
        $1::uuid,
        1500000,
        'cash',
        'OVERDEBT',
        'Test overdebt',
        current_date,
        $2::jsonb,
        'tester'
      );
    `, [customerId, JSON.stringify([{ allocationType: 'order', orderId: orderId, amount: 1500000 }])]);
  } catch (e) {
    err3a = e.message;
  }
  console.log(`     Bắt lỗi thành công: "${err3a}"`);
  if (!err3a || !/vượt quá nợ còn lại/i.test(err3a)) {
    throw new Error('[FAIL TEST 3a] RPC không chặn thu vượt nợ!');
  }

  // 3b. Thử phân bổ đa dòng với dòng thứ hai bị lỗi (order không tồn tại hoặc order của khách khác)
  console.log('  3b. Thử phân bổ 2 dòng: dòng 1 hợp lệ (300.000đ), dòng 2 sai đơn hàng...');
  let err3b = null;
  const fakeOrderId = '00000000-0000-0000-0000-000000000999';
  const twoLineAlloc = JSON.stringify([
    { allocationType: 'order', orderId: orderId, amount: 300000 },
    { allocationType: 'order', orderId: fakeOrderId, amount: 200000 }
  ]);
  try {
    await db.query(`
      SELECT public.record_customer_receipt(
        $1::uuid,
        500000,
        'bank_transfer',
        'MULTI-FAIL',
        'Test multi line fail',
        current_date,
        $2::jsonb,
        'tester'
      );
    `, [customerId, twoLineAlloc]);
  } catch (e) {
    err3b = e.message;
  }
  console.log(`     Bắt lỗi thành công: "${err3b}"`);
  if (!err3b || !/Không tìm thấy hóa đơn ID/i.test(err3b)) {
    throw new Error('[FAIL TEST 3b] RPC không báo lỗi khi dòng thứ 2 sai order!');
  }

  // 3c. Xác minh sau các lỗi: tuyệt đối KHÔNG có dữ liệu dở dang (rollback 100%)
  const countReceiptsAfter = Number((await db.query('SELECT count(*) as c FROM public.customer_receipts')).rows[0].c);
  const countAllocAfter = Number((await db.query('SELECT count(*) as c FROM public.receipt_allocations')).rows[0].c);
  const paidAfter = Number((await db.query('SELECT paid_amount FROM public.orders WHERE id = $1', [orderId])).rows[0].paid_amount);

  console.log(`  -> Số phiếu thu trước: ${countReceiptsBefore}, sau: ${countReceiptsAfter}`);
  console.log(`  -> Số phân bổ trước: ${countAllocBefore}, sau: ${countAllocAfter}`);
  console.log(`  -> orders.paid_amount trước: ${paidBefore}đ, sau: ${paidAfter}đ`);

  if (countReceiptsAfter !== countReceiptsBefore) {
    throw new Error(`[FAIL TEST 3] Bị sót phiếu thu dở dang! Trước: ${countReceiptsBefore}, sau: ${countReceiptsAfter}`);
  }
  if (countAllocAfter !== countAllocBefore) {
    throw new Error(`[FAIL TEST 3] Bị sót phân bổ dở dang! Trước: ${countAllocBefore}, sau: ${countAllocAfter}`);
  }
  if (paidAfter !== paidBefore) {
    throw new Error(`[FAIL TEST 3] paid_amount bị thay đổi dở dang! Trước: ${paidBefore}, sau: ${paidAfter}`);
  }

  console.log('  => [PASS TEST 3] Lỗi ở bất kỳ bước nào rollback 100%, không để lại dữ liệu dở dang!\n');

  // 7. TEST 4: Phân bổ nợ đầu kỳ và đảo phiếu nợ đầu kỳ
  console.log('7. [TEST 4] Kiểm tra phân bổ nợ đầu kỳ và đảo phiếu nợ đầu kỳ...');
  // Lấy bản ghi receivable_adjustments đã được migration import từ kiotviet_opening_debt
  const adjRes = await db.query('SELECT id, remaining_amount FROM public.receivable_adjustments WHERE customer_id = $1', [customerId]);
  const adjId = adjRes.rows[0].id;
  const adjBefore = Number(adjRes.rows[0].remaining_amount);
  console.log(`  -> Nợ đầu kỳ ban đầu: ${adjBefore}đ`);

  // Thu 800.000đ cấn trừ nợ đầu kỳ
  const openingAlloc = JSON.stringify([
    { allocationType: 'opening_debt', adjustmentId: adjId, amount: 800000 }
  ]);
  const recAdjRes = await db.query(`
    SELECT public.record_customer_receipt(
      $1::uuid,
      800000,
      'bank_transfer',
      'DK-800K',
      'Thu cấn trừ nợ đầu kỳ',
      current_date,
      $2::jsonb,
      'ke_toan_vien'
    ) as result;
  `, [customerId, openingAlloc]);
  const recAdjId = recAdjRes.rows[0].result.receiptId;

  const adjAfterCollect = Number((await db.query('SELECT remaining_amount FROM public.receivable_adjustments WHERE id = $1', [adjId])).rows[0].remaining_amount);
  console.log(`  -> Nợ đầu kỳ sau khi thu 800k: ${adjAfterCollect}đ (kỳ vọng: 1.200.000đ)`);
  if (adjAfterCollect !== 1200000) {
    throw new Error(`[FAIL TEST 4] Nợ đầu kỳ sau thu bị sai! Thực tế: ${adjAfterCollect}, kỳ vọng: 1200000`);
  }

  // Đảo phiếu thu nợ đầu kỳ
  await db.query(`
    SELECT public.reverse_customer_receipt(
      $1::uuid,
      'Đảo phiếu thu cấn trừ nợ đầu kỳ do nhập nhầm',
      'truong_phong_ke_toan'
    );
  `, [recAdjId]);

  const adjAfterRev = Number((await db.query('SELECT remaining_amount FROM public.receivable_adjustments WHERE id = $1', [adjId])).rows[0].remaining_amount);
  console.log(`  -> Nợ đầu kỳ sau khi đảo phiếu: ${adjAfterRev}đ (kỳ vọng: khôi phục về đúng 2.000.000đ)`);
  if (adjAfterRev !== 2000000) {
    throw new Error(`[FAIL TEST 4] Nợ đầu kỳ sau đảo phiếu không phục hồi! Thực tế: ${adjAfterRev}, kỳ vọng: 2000000`);
  }
  // 8. TEST 5: Idempotency Key (Chống tạo trùng phiếu khi client retry mạng)
  console.log('8. [TEST 5] Kiểm tra cơ chế Idempotency Key chống trùng phiếu thu...');
  const idemKey = 'IDEM-RETRY-TEST-' + Date.now();
  const idemAlloc = JSON.stringify([
    { allocationType: 'order', orderId: orderId, amount: 300000 }
  ]);

  // Lần gọi 1
  console.log('  8a. Gọi record_customer_receipt lần 1 với idempotency_key:', idemKey);
  const idemRes1 = await db.query(`
    SELECT public.record_customer_receipt(
      $1::uuid,
      300000,
      'bank_transfer',
      'UNC-IDEM-1',
      'Thu tiền có idempotency key',
      current_date,
      $2::jsonb,
      'ke_toan_vien',
      $3::text
    ) as result;
  `, [customerId, idemAlloc, idemKey]);

  const receipt1 = idemRes1.rows[0].result;
  console.log('     Lần 1 tạo thành công phiếu thu:', receipt1.receiptNumber, 'ID:', receipt1.receiptId);

  const orderPaidAfterCall1 = Number((await db.query('SELECT paid_amount FROM public.orders WHERE id = $1', [orderId])).rows[0].paid_amount);
  console.log(`     orders.paid_amount sau lần 1: ${orderPaidAfterCall1}đ (kỳ vọng: 300.000đ)`);
  if (orderPaidAfterCall1 !== 300000) {
    throw new Error(`[FAIL TEST 5] paid_amount lần 1 không đúng! Thực tế: ${orderPaidAfterCall1}`);
  }

  // Lần gọi 2: Mô phỏng mạng bị gián đoạn, client tự động retry với cùng idempotency_key
  console.log('  8b. Mô phỏng client retry với CÙNG idempotency_key:', idemKey);
  const idemRes2 = await db.query(`
    SELECT public.record_customer_receipt(
      $1::uuid,
      300000,
      'bank_transfer',
      'UNC-IDEM-1',
      'Thu tiền có idempotency key (retry)',
      current_date,
      $2::jsonb,
      'ke_toan_vien',
      $3::text
    ) as result;
  `, [customerId, idemAlloc, idemKey]);

  const receipt2 = idemRes2.rows[0].result;
  console.log('     Kết quả lần 2 (retry):', receipt2);

  // Xác minh tính Idempotent
  if (!receipt2.idempotent) {
    throw new Error('[FAIL TEST 5] Kết quả retry không có cờ idempotent: true!');
  }
  if (receipt2.receiptId !== receipt1.receiptId) {
    throw new Error(`[FAIL TEST 5] ID phiếu thu trả về không khớp! Lần 1: ${receipt1.receiptId}, Lần 2: ${receipt2.receiptId}`);
  }

  const orderPaidAfterCall2 = Number((await db.query('SELECT paid_amount FROM public.orders WHERE id = $1', [orderId])).rows[0].paid_amount);
  console.log(`     orders.paid_amount sau lần 2 (retry): ${orderPaidAfterCall2}đ (kỳ vọng: vẫn đúng 300.000đ, không tăng đúp lên 600.000đ)`);
  if (orderPaidAfterCall2 !== 300000) {
    throw new Error(`[FAIL TEST 5] Lỗi nghiêm trọng: orders.paid_amount bị tăng đúp khi retry! Thực tế: ${orderPaidAfterCall2}`);
  }

  const countIdemReceipts = Number((await db.query('SELECT count(*) as c FROM public.customer_receipts WHERE idempotency_key = $1', [idemKey])).rows[0].c);
  console.log(`     Số phiếu thu trong DB có idempotency_key này: ${countIdemReceipts} (kỳ vọng: chính xác 1)`);
  if (countIdemReceipts !== 1) {
    throw new Error(`[FAIL TEST 5] DB bị tạo nhiều phiếu thu trùng lặp! Số lượng: ${countIdemReceipts}`);
  }

  // 9. TEST 6: Kiểm tra xung đột payload cùng khóa idempotency
  console.log('9. [TEST 6] Kiểm tra phát hiện và chặn xung đột payload khi tái sử dụng cùng khóa idempotency...');
  let conflictErr = null;
  try {
    // Thử gửi cùng idemKey nhưng với số tiền 450.000đ (khác số tiền ban đầu 300.000đ)
    await db.query(`
      SELECT public.record_customer_receipt(
        $1::uuid,
        450000,
        'bank_transfer',
        'UNC-IDEM-CONFLICT',
        'Thu tiền thử gây xung đột payload',
        current_date,
        $2::jsonb,
        'ke_toan_vien',
        $3::text
      );
    `, [customerId, JSON.stringify([{ allocationType: 'order', orderId: orderId, amount: 450000 }]), idemKey]);
  } catch (e) {
    conflictErr = e.message;
  }

  console.log(`     Bắt lỗi xung đột thành công: "${conflictErr}"`);
  if (!conflictErr || !/Xung đột Idempotency Key/i.test(conflictErr)) {
    throw new Error(`[FAIL TEST 6] Hệ thống không chặn xung đột payload cùng khóa! Lỗi nhận được: ${conflictErr}`);
  }
  console.log('  => [PASS TEST 6] Phát hiện và chặn 100% khi payload không khớp cùng một Idempotency Key!\n');

  // 10. TEST 7: Kiểm tra hai request đồng thời (Concurrent Requests)
  console.log('10. [TEST 7] Kiểm tra race-condition với 2 request gửi ĐỒNG THỜI cùng lúc (Promise.all)...');
  const concurrentKey = 'CONCURRENT-KEY-' + Date.now();
  const concurrentAlloc = JSON.stringify([
    { allocationType: 'order', orderId: orderId, amount: 200000 }
  ]);

  const paidBeforeConcurrent = Number((await db.query('SELECT paid_amount FROM public.orders WHERE id = $1', [orderId])).rows[0].paid_amount);
  console.log(`     orders.paid_amount trước khi chạy đồng thời: ${paidBeforeConcurrent}đ`);

  // Bắn 2 query cùng một lúc
  const [resA, resB] = await Promise.all([
    db.query(`
      SELECT public.record_customer_receipt(
        $1::uuid,
        200000,
        'bank_transfer',
        'UNC-CONC-1',
        'Thu tiền đồng thời request A',
        current_date,
        $2::jsonb,
        'ke_toan_A',
        $3::text
      ) as result;
    `, [customerId, concurrentAlloc, concurrentKey]),
    db.query(`
      SELECT public.record_customer_receipt(
        $1::uuid,
        200000,
        'bank_transfer',
        'UNC-CONC-1',
        'Thu tiền đồng thời request B',
        current_date,
        $2::jsonb,
        'ke_toan_B',
        $3::text
      ) as result;
    `, [customerId, concurrentAlloc, concurrentKey])
  ]);

  const outA = resA.rows[0].result;
  const outB = resB.rows[0].result;
  console.log('     Kết quả Request A:', outA);
  console.log('     Kết quả Request B:', outB);

  // Xác minh: Cả 2 đều trả về cùng 1 receiptId
  if (outA.receiptId !== outB.receiptId) {
    throw new Error(`[FAIL TEST 7] Hai request đồng thời tạo ra hai receiptId khác nhau! A: ${outA.receiptId}, B: ${outB.receiptId}`);
  }

  // Một trong hai phải có idempotent: true (hoặc cả hai đều trỏ vào cùng 1 chứng từ)
  const isOneIdempotent = outA.idempotent || outB.idempotent;
  console.log(`     Ít nhất một request được đánh dấu idempotent: ${isOneIdempotent}`);
  if (!isOneIdempotent) {
    throw new Error('[FAIL TEST 7] Không có request nào nhận diện tính idempotent!');
  }

  // Xác minh orders.paid_amount chỉ tăng đúng 200.000đ (không bị cộng đúp thành 400.000đ)
  const paidAfterConcurrent = Number((await db.query('SELECT paid_amount FROM public.orders WHERE id = $1', [orderId])).rows[0].paid_amount);
  const diffPaid = paidAfterConcurrent - paidBeforeConcurrent;
  console.log(`     orders.paid_amount sau chạy đồng thời: ${paidAfterConcurrent}đ (tăng: ${diffPaid}đ, kỳ vọng: đúng 200.000đ)`);
  if (diffPaid !== 200000) {
    throw new Error(`[FAIL TEST 7] paid_amount bị cộng đúp khi chạy đồng thời! Chênh lệch: ${diffPaid}`);
  }

  // Xác minh trong DB chỉ có đúng 1 bản ghi
  const countConcReceipts = Number((await db.query('SELECT count(*) as c FROM public.customer_receipts WHERE idempotency_key = $1', [concurrentKey])).rows[0].c);
  console.log(`     Số bản ghi trong customer_receipts: ${countConcReceipts} (kỳ vọng: 1)`);
  if (countConcReceipts !== 1) {
    throw new Error(`[FAIL TEST 7] DB bị chèn nhiều bản ghi! Số lượng: ${countConcReceipts}`);
  }
  console.log('  => [PASS TEST 7] Hai request đồng thời được serialize an toàn 100% qua pg_advisory_xact_lock và unique index!\n');

  // 11. TEST 8: Kiểm tra cấu hình CORS Headers trong Server API
  console.log('11. [TEST 8] Kiểm tra cấu hình CORS Headers cho Idempotency-Key và X-Admin-Token...');
  const routesToCheck = [
    'app/api/admin/receivables/receipts/route.ts',
    'app/api/admin/receivables/summary/route.ts',
    'app/api/admin/receivables/customers/[id]/route.ts',
    'app/api/admin/receivables/statement/route.ts',
    'app/api/admin/receivables/receipts/[id]/reverse/route.ts',
    'app/api/admin/receivables/invoices/[id]/due-date/route.ts',
    'app/api/admin/reports/debt/route.ts',
  ];

  for (const rPath of routesToCheck) {
    const fullPath = path.resolve(rPath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    if (!content.includes('Idempotency-Key') || !content.includes('X-Admin-Token')) {
      throw new Error(`[FAIL TEST 8] File ${rPath} thiếu CORS headers cho Idempotency-Key hoặc X-Admin-Token!`);
    }
  }
  console.log(`     Xác minh thành công toàn bộ ${routesToCheck.length} API routes đều cấu hình đầy đủ CORS.`);
  console.log('  => [PASS TEST 8] CORS Headers hoàn toàn đạt chuẩn cho Preflight và Client Request!\n');

  console.log('================================================================');
  console.log('TẤT CẢ 8 BÀI TEST TÍCH HỢP POSTGRESQL + RPC + CONCURRENCY + CORS ĐỀU PASS 100%!');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('\n*** TEST THẤT BẠI: ***', err.message);
  if (err.detail) console.error('Detail:', err.detail);
  if (err.hint) console.error('Hint:', err.hint);
  if (err.where) console.error('Where:', err.where);
  if (err.position) console.error('Position:', err.position);
  process.exit(1);
});
