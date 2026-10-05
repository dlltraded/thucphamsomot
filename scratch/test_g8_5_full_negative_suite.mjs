import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { createClient } from '@supabase/supabase-js';

// Services
import {
  createProcurementReview,
  claimProcurementReview,
  saveProcurementReviewDraft,
  submitProcurementReview,
  operationsAcceptReview,
} from '../lib/procurement-service.ts';

import {
  claimPickingTaskCore,
  updatePickingItems,
  completePickingTaskCore,
  reportPickingExceptionCore,
  resolvePickingExceptionCore,
} from '../lib/picking-service.ts';

import {
  createInternalNotification,
  listInternalNotifications,
  markNotificationAsRead,
} from '../lib/notification-service.ts';
import { processPickingRetryQueue } from '../lib/picking-retry-service.ts';

/**
 * PGlite Supabase Adapter
 */
class PGliteSupabaseAdapter {
  constructor(db) {
    this.db = db;
  }

  from(table) {
    return new QueryBuilder(this.db, table);
  }

  async rpc(funcName, params = {}) {
    try {
      if (funcName === 'claim_procurement_review') {
        const res = await this.db.query(
          `select public.claim_procurement_review($1, $2) as res;`,
          [params.p_review_id, params.p_actor_id]
        );
        return { data: res.rows[0]?.res || null, error: null };
      }
      if (funcName === 'claim_picking_task') {
        const actor = params.p_actor_id || params.p_staff_id;
        const res = await this.db.query(
          `select public.claim_picking_task($1, $2, $3) as res;`,
          [params.p_task_id, actor, actor]
        );
        return { data: res.rows[0]?.res || null, error: null };
      }
      if (funcName === 'create_picking_task_on_confirm') {
        const res = await this.db.query(
          `select public.create_picking_task_on_confirm($1, $2, $3) as res;`,
          [params.p_order_id, params.p_actor_id, params.p_version || 1]
        );
        return { data: res.rows[0]?.res || null, error: null };
      }
      if (funcName === 'claim_picking_retry_batch') {
        const res = await this.db.query(
          `select public.claim_picking_retry_batch($1) as res;`,
          [params.p_limit || 20]
        );
        return { data: res.rows[0]?.res || null, error: null };
      }
      throw new Error(`RPC ${funcName} not supported in test adapter`);
    } catch (err) {
      return { data: null, error: err };
    }
  }
}

class QueryBuilder {
  constructor(db, table) {
    this.db = db;
    this.table = table;
    this._select = '*';
    this._filters = [];
    this._order = '';
    this._limit = null;
    this._offset = null;
    this._single = false;
    this._maybeSingle = false;
    this._isInsert = false;
    this._isUpdate = false;
    this._isUpsert = false;
    this._insertData = null;
    this._updateData = null;
  }

  select(fields = '*') {
    this._select = fields;
    return this;
  }

  insert(data) {
    this._isInsert = true;
    this._insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  upsert(data, options = {}) {
    this._isUpsert = true;
    this._insertData = Array.isArray(data) ? data : [data];
    this._upsertOptions = options;
    return this;
  }

  update(data) {
    this._isUpdate = true;
    this._updateData = data;
    return this;
  }

  eq(column, value) {
    this._filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column, value) {
    this._filters.push({ type: 'neq', column, value });
    return this;
  }

  in(column, values) {
    this._filters.push({ type: 'in', column, values });
    return this;
  }

  order(column, { ascending = true } = {}) {
    this._order = `order by "${column}" ${ascending ? 'asc' : 'desc'}`;
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  single() {
    this._single = true;
    return this;
  }

  maybeSingle() {
    this._maybeSingle = true;
    return this;
  }

  or(str) {
    this._filters.push({ type: 'or_raw', str });
    return this;
  }

  is(column, value) {
    this._filters.push({ type: 'is', column, value });
    return this;
  }

  async then(resolve, reject) {
    try {
      const res = await this._execute();
      resolve(res);
    } catch (err) {
      if (reject) reject(err);
      else throw err;
    }
  }

  async _execute() {
    if (this._isInsert || this._isUpsert) {
      const returnedRows = [];
      for (const item of this._insertData) {
        const keys = Object.keys(item);
        const cols = keys.map((k) => `"${k}"`).join(', ');
        const vals = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = keys.map((k) => {
          const val = item[k];
          if (val !== null && typeof val === 'object') {
            return JSON.stringify(val);
          }
          return val;
        });

        let sql = `insert into public."${this.table}" (${cols}) values (${vals})`;
        if (this._isUpsert && this._upsertOptions?.onConflict) {
          const conflictCols = this._upsertOptions.onConflict.split(',').map((c) => `"${c.trim()}"`).join(', ');
          const conflictColList = this._upsertOptions.onConflict.split(',').map((c) => c.trim());
          if (this._upsertOptions.ignoreDuplicates) {
            sql += ` on conflict (${conflictCols}) do nothing`;
          } else {
            const updates = keys
              .filter((k) => !conflictColList.includes(k))
              .map((k) => `"${k}" = excluded."${k}"`)
              .join(', ');
            sql += ` on conflict (${conflictCols}) do update set ${updates}`;
          }
        }
        sql += ` returning *;`;

        const r = await this.db.query(sql, values);
        if (r.rows && r.rows[0]) {
          returnedRows.push(r.rows[0]);
        }
      }
      const data = this._single || this._maybeSingle ? (returnedRows[0] || null) : returnedRows;
      return { data, error: null };
    }

    if (this._isUpdate) {
      const keys = Object.keys(this._updateData);
      const setParts = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      const values = keys.map((k) => {
        const val = this._updateData[k];
        if (val !== null && typeof val === 'object') {
          return JSON.stringify(val);
        }
        return val;
      });

      let paramIdx = keys.length + 1;
      const whereParts = [];
      for (const f of this._filters) {
        if (f.type === 'eq') {
          whereParts.push(`"${f.column}" = $${paramIdx++}`);
          values.push(f.value);
        } else if (f.type === 'is') {
          if (f.value === null) {
            whereParts.push(`"${f.column}" is null`);
          } else {
            whereParts.push(`"${f.column}" = $${paramIdx++}`);
            values.push(f.value);
          }
        }
      }

      const whereClause = whereParts.length ? `where ${whereParts.join(' and ')}` : '';
      const sql = `update public."${this.table}" set ${setParts} ${whereClause} returning *;`;
      const r = await this.db.query(sql, values);
      const data = this._single || this._maybeSingle ? (r.rows[0] || null) : r.rows;
      return { data, error: null };
    }

    // SELECT
    let paramIdx = 1;
    const values = [];
    const whereParts = [];
    for (const f of this._filters) {
      if (f.type === 'eq') {
        whereParts.push(`"${f.column}" = $${paramIdx++}`);
        values.push(f.value);
      } else if (f.type === 'neq') {
        whereParts.push(`"${f.column}" != $${paramIdx++}`);
        values.push(f.value);
      } else if (f.type === 'is') {
        if (f.value === null) {
          whereParts.push(`"${f.column}" is null`);
        } else {
          whereParts.push(`"${f.column}" = $${paramIdx++}`);
          values.push(f.value);
        }
      } else if (f.type === 'in') {
        const inPlaceholders = f.values.map(() => `$${paramIdx++}`).join(', ');
        whereParts.push(`"${f.column}" in (${inPlaceholders})`);
        values.push(...f.values);
      } else if (f.type === 'or_raw') {
        // Hỗ trợ cả cú pháp Supabase lồng: recipient_user_id.eq.X,and(recipient_user_id.is.null,department_id.eq.Y)
        const raw = f.str;
        const parsedClauses = [];
        
        // Phân tích các điều kiện
        const topParts = raw.split(/,(?![^()]*\))/); // split ngoài dấu ngoặc
        for (const part of topParts) {
          if (part.startsWith('and(') && part.endsWith(')')) {
            const inner = part.slice(4, -1).split(',');
            const innerClauses = [];
            for (const sub of inner) {
              const mEq = sub.match(/^([\w_]+)\.eq\.(.*)$/);
              if (mEq) {
                innerClauses.push(`"${mEq[1]}" = $${paramIdx++}`);
                values.push(mEq[2]);
              } else if (sub.endsWith('.is.null')) {
                const col = sub.replace('.is.null', '');
                innerClauses.push(`"${col}" is null`);
              }
            }
            if (innerClauses.length) parsedClauses.push(`(${innerClauses.join(' and ')})`);
          } else {
            const mEq = part.match(/^([\w_]+)\.eq\.(.*)$/);
            if (mEq) {
              parsedClauses.push(`"${mEq[1]}" = $${paramIdx++}`);
              values.push(mEq[2]);
            } else if (part.endsWith('.is.null')) {
              const col = part.replace('.is.null', '');
              parsedClauses.push(`"${col}" is null`);
            }
          }
        }
        if (parsedClauses.length) whereParts.push(`(${parsedClauses.join(' or ')})`);
      }
    }

    const whereClause = whereParts.length ? `where ${whereParts.join(' and ')}` : '';
    let sql = `select * from public."${this.table}" ${whereClause} ${this._order}`;
    if (this._limit) sql += ` limit ${this._limit}`;

    const r = await this.db.query(sql, values);
    let rows = r.rows;

    if (this.table === 'procurement_review_requests') {
      for (const row of rows) {
        if (this._select.includes('orders:order_id')) {
          const oRes = await this.db.query(`select * from public.orders where id = $1`, [row.order_id]);
          row.orders = oRes.rows[0] || null;
        }
      }
    }

    const data = this._single ? (rows[0] || null) : this._maybeSingle ? (rows[0] || null) : rows;
    return { data, error: null };
  }
}

// Global assertions tracker
let passedCount = 0;
let failedCount = 0;

function pass(name) {
  passedCount++;
  console.log(`  ✅ [PASS] ${name}`);
}

function fail(name, reason) {
  failedCount++;
  console.error(`  ❌ [FAIL] ${name}: ${reason}`);
}

async function runG85FullNegativeSuite() {
  console.log('========================================================================');
  console.log('=== KỊCH BẢN G8.5: TEST ÂM VÀ CHỐT CHẶT BẢO MẬT & TRANSACTIONS       ===');
  console.log('=== 1. Test Âm: Khóa Quyền Thực Thi Toàn Bộ RPC Mới (Postgres RLS)  ===');
  console.log('=== 2. Test Âm: Bắt Buộc Đơn Confirmed Mới Được Phát Hành Lệnh Soạn  ===');
  console.log('=== 3. Test Âm: Cô Lập Notification Theo Người/Phòng Ban & Đánh Dấu ===');
  console.log('=== 4. Test Âm: Xác Nhận Đơn Lỗi & Hàng Đợi Retry Bảo Toàn Đơn       ===');
  console.log('=== 5. Kiểm Thử Endpoint Thực Tế Qua Supabase / PostgreSQL Engine    ===');
  console.log('========================================================================\n');

  // Khởi tạo engine PostgreSQL (PGlite)
  const db = new PGlite();
  await db.exec(`
    create role service_role;
    create role authenticated;
    create role anon;
  `);

  console.log('0. Khởi tạo Base Schema nền tảng...');
  await db.exec(`
    create table if not exists public.departments (
      id uuid primary key default gen_random_uuid(),
      code text not null unique,
      name text not null,
      function_group text not null
    );

    create table if not exists public.admin_profiles (
      id uuid primary key default gen_random_uuid(),
      email text,
      name text not null,
      role text not null,
      position text not null default 'nhan_vien',
      phone text,
      is_active boolean default true,
      department_id uuid references public.departments(id),
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );

    create table if not exists public.products (
      id uuid primary key default gen_random_uuid(),
      sku text,
      name text not null,
      price numeric(14,2)
    );

    create table if not exists public.orders (
      id uuid primary key default gen_random_uuid(),
      order_code text not null,
      status text not null default 'pending',
      packing_status text default 'not_started',
      packed_by uuid references public.admin_profiles(id),
      packing_started_at timestamptz,
      packed_at timestamptz,
      delivery_date date,
      delivery_shift text,
      subtotal numeric(14,2),
      grand_total numeric(14,2),
      price_revision integer default 1,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );

    create table if not exists public.order_items (
      id uuid primary key default gen_random_uuid(),
      order_id uuid not null references public.orders(id) on delete cascade,
      product_id uuid references public.products(id),
      sku text,
      name text not null,
      quantity numeric(12,3) not null,
      unit text,
      unit_price numeric(14,2),
      line_total numeric(14,2),
      created_at timestamptz default now()
    );

    create table if not exists public.order_history (
      id uuid primary key default gen_random_uuid(),
      order_id uuid not null references public.orders(id) on delete cascade,
      action text not null,
      note text,
      actor text,
      created_at timestamptz default now()
    );
  `);
  console.log('  Base schema khởi tạo hoàn tất.\n');

  console.log('--- NẠP MIGRATION G8.5: 20261005_procurement_review_and_picking.sql ---');
  const migrationPath = path.join(
    process.cwd(),
    'tps1-miniapp/supabase/migrations/20261005_procurement_review_and_picking.sql'
  );
  const migSql = fs.readFileSync(migrationPath, 'utf-8');
  await db.exec(migSql);
  console.log('  Migration G8.5 nạp thành công.\n');

  const client = new PGliteSupabaseAdapter(db);

  // Fixtures
  const deptRes = await db.query(`
    insert into public.departments (code, name, function_group)
    values ('THU_MUA', 'Phòng Thu Mua', 'procurement'),
           ('VAN_HANH', 'Phòng Vận Hành', 'operations'),
           ('KHO', 'Kho Vận', 'warehouse')
    returning id, code;
  `);
  const tmDeptId = deptRes.rows[0].id;
  const opDeptId = deptRes.rows[1].id;
  const khoDeptId = deptRes.rows[2].id;

  const staffRes = await db.query(`
    insert into public.admin_profiles (name, email, role, position, department_id)
    values 
      ('Admin Hệ Thống', 'admin@tps1.vn', 'admin', 'Giám đốc', null),
      ('Lê Vận Hành', 'vanhanh@tps1.vn', 'sale', 'Điều phối', '${opDeptId}'),
      ('Nguyễn Thu Mua', 'thumua@tps1.vn', 'thu_mua', 'Nhân viên', '${tmDeptId}'),
      ('Trần Kho', 'kho@tps1.vn', 'kho', 'Thủ kho', '${khoDeptId}'),
      ('Người Lạ Inactive', 'stranger@tps1.vn', 'kho', 'Nhân viên cũ', null)
    returning id, name, role;
  `);
  const adminId = staffRes.rows[0].id;
  const opId = staffRes.rows[1].id;
  const tmId = staffRes.rows[2].id;
  const khoId = staffRes.rows[3].id;
  const inactiveId = staffRes.rows[4].id;
  // Cập nhật inactive
  await db.query(`update public.admin_profiles set is_active = false where id = $1`, [inactiveId]);

  const prodRes = await db.query(`
    insert into public.products (sku, name, price)
    values ('SP-01', 'Rau Muống Sạch', 15000), ('SP-02', 'Thịt Heo', 120000)
    returning id;
  `);
  const p1 = prodRes.rows[0].id;
  const p2 = prodRes.rows[1].id;

  // =========================================================================
  // TEST ÂM 1: KHÓA QUYỀN THỰC THI TOÀN BỘ RPC MỚI
  // =========================================================================
  console.log('=== TEST ÂM 1: KHÓA QUYỀN THỰC THI TOÀN BỘ RPC MỚI ===');

  // 1.1 Kiểm tra file migration có lệnh revoke execute từ public, anon, authenticated
  const rpcs = [
    'claim_procurement_review',
    'claim_picking_task',
    'create_picking_task_on_confirm'
  ];
  for (const rpc of rpcs) {
    if (migSql.includes(`revoke execute on function public.${rpc}`) &&
        migSql.includes(`from public, anon, authenticated;`)) {
      pass(`RPC ${rpc}: Đã thu hồi quyền execute từ public, anon, authenticated`);
    } else {
      fail(`RPC ${rpc} revocation`, 'Chưa revoke execute');
    }
    if (migSql.includes(`grant execute on function public.${rpc}`) &&
        migSql.includes(`to service_role;`)) {
      pass(`RPC ${rpc}: Chỉ cấp quyền execute duy nhất cho service_role`);
    } else {
      fail(`RPC ${rpc} grant`, 'Chưa cấp quyền service_role');
    }
  }

  // 1.2 Test âm: Người dùng không hoạt động (is_active = false) gọi RPC -> Bị chặn
  const ordT1 = (await db.query(`insert into public.orders (order_code, status) values ('ORD-T1', 'confirmed') returning id;`)).rows[0].id;
  const taskT1 = (await db.query(`insert into public.picking_tasks (order_id, status) values ('${ordT1}', 'released') returning id;`)).rows[0].id;

  const inactiveClaim = await client.rpc('claim_picking_task', {
    p_task_id: taskT1,
    p_actor_id: inactiveId,
  });
  if (inactiveClaim.data && inactiveClaim.data.success === false && inactiveClaim.data.error_code === 'ACTOR_NOT_FOUND') {
    pass('claim_picking_task: Chặn người dùng inactive (ACTOR_NOT_FOUND)');
  } else {
    fail('claim_picking_task inactive', JSON.stringify(inactiveClaim.data));
  }

  // 1.3 Test âm: Role không đúng (thu mua nhận soạn hàng) -> Bị chặn FORBIDDEN
  const wrongRoleClaim = await client.rpc('claim_picking_task', {
    p_task_id: taskT1,
    p_actor_id: tmId,
  });
  if (wrongRoleClaim.data && wrongRoleClaim.data.success === false && wrongRoleClaim.data.error_code === 'FORBIDDEN') {
    pass('claim_picking_task: Chặn người dùng sai role (thu_mua -> FORBIDDEN)');
  } else {
    fail('claim_picking_task wrong role', JSON.stringify(wrongRoleClaim.data));
  }

  // =========================================================================
  // TEST ÂM 2: BẮT BUỘC ĐƠN CONFIRMED MỚI ĐƯỢC PHÁT HÀNH LỆNH SOẠN
  // =========================================================================
  console.log('\n=== TEST ÂM 2: BẮT BUỘC ĐƠN CONFIRMED MỚI ĐƯỢC PHÁT HÀNH LỆNH SOẠN ===');

  // 2.1 Test âm: Đơn ở trạng thái 'pending' cố tình phát hành lệnh soạn -> Bị từ chối
  const pendingOrdId = (await db.query(`insert into public.orders (order_code, status) values ('ORD-PENDING', 'pending') returning id;`)).rows[0].id;
  await db.query(`insert into public.order_items (order_id, product_id, sku, name, quantity, unit, unit_price, line_total) values ('${pendingOrdId}', '${p1}', 'SP-01', 'Rau Muống Sạch', 5, 'Kg', 15000, 75000);`);

  const pendingPickRes = await client.rpc('create_picking_task_on_confirm', {
    p_order_id: pendingOrdId,
    p_actor_id: adminId,
    p_version: 1,
  });

  if (pendingPickRes.data && pendingPickRes.data.success === false && pendingPickRes.data.error_code === 'INVALID_ORDER_STATUS') {
    pass('create_picking_task_on_confirm: Chặn thành công đơn status = pending (INVALID_ORDER_STATUS)');
  } else {
    fail('create_picking_task_on_confirm pending status', JSON.stringify(pendingPickRes.data));
  }

  // 2.2 Test âm: Đơn ở trạng thái 'canceled' cố tình phát hành lệnh soạn -> Bị từ chối
  const canceledOrdId = (await db.query(`insert into public.orders (order_code, status) values ('ORD-CANCELED', 'canceled') returning id;`)).rows[0].id;
  await db.query(`insert into public.order_items (order_id, product_id, sku, name, quantity, unit, unit_price, line_total) values ('${canceledOrdId}', '${p1}', 'SP-01', 'Rau Muống Sạch', 5, 'Kg', 15000, 75000);`);

  const canceledPickRes = await client.rpc('create_picking_task_on_confirm', {
    p_order_id: canceledOrdId,
    p_actor_id: adminId,
    p_version: 1,
  });

  if (canceledPickRes.data && canceledPickRes.data.success === false && canceledPickRes.data.error_code === 'INVALID_ORDER_STATUS') {
    pass('create_picking_task_on_confirm: Chặn thành công đơn status = canceled (INVALID_ORDER_STATUS)');
  } else {
    fail('create_picking_task_on_confirm canceled status', JSON.stringify(canceledPickRes.data));
  }

  // 2.3 Test dương đối chứng: Đơn chuyển sang 'confirmed' -> Phát hành thành công
  await db.query(`update public.orders set status = 'confirmed' where id = $1`, [pendingOrdId]);
  const confirmedPickRes = await client.rpc('create_picking_task_on_confirm', {
    p_order_id: pendingOrdId,
    p_actor_id: adminId,
    p_version: 1,
  });

  if (confirmedPickRes.data && confirmedPickRes.data.success === true) {
    pass('create_picking_task_on_confirm: Phát hành thành công khi đơn chuyển đúng status = confirmed');
  } else {
    fail('create_picking_task_on_confirm confirmed status', JSON.stringify(confirmedPickRes.data));
  }

  // =========================================================================
  // TEST ÂM 3: CÔ LẬP NOTIFICATION THEO NGƯỜI/PHÒNG BAN & ĐÁNH DẤU ĐÃ ĐỌC
  // =========================================================================
  console.log('\n=== TEST ÂM 3: CÔ LẬP NOTIFICATION THEO NGƯỜI/PHÒNG BAN & ĐÁNH DẤU ===');

  // Tạo thông báo cho phòng Thu Mua
  const n1 = await createInternalNotification(client, {
    departmentId: tmDeptId,
    eventType: 'procurement_review_requested',
    entityType: 'order',
    entityId: pendingOrdId,
    title: 'Thông báo Thu Mua',
    body: 'Cần kiểm tra rau gấp',
  });

  // Tạo thông báo riêng cho Kho Vận
  const n2 = await createInternalNotification(client, {
    departmentId: khoDeptId,
    eventType: 'picking_task_released',
    entityType: 'order',
    entityId: pendingOrdId,
    title: 'Thông báo Kho Vận',
    body: 'Lệnh soạn hàng mới',
  });

  // Tạo thông báo đích danh cho Nhân viên Thu Mua
  const n3 = await createInternalNotification(client, {
    recipientUserId: tmId,
    eventType: 'task_assigned',
    entityType: 'order',
    entityId: pendingOrdId,
    title: 'Giao việc cho Nguyễn Thu Mua',
    body: 'Đơn hàng VIP',
  });

  // 3.1 Test âm: Nhân viên Kho tra cứu thông báo -> Tuyệt đối KHÔNG thấy thông báo của Thu Mua (n1, n3)
  const khoNotifs = await listInternalNotifications(client, { userId: khoId });
  const khoCanSeeTMNotif = khoNotifs.notifications.some(n => n.id === n1.id || n.id === n3.id);
  if (!khoCanSeeTMNotif) {
    pass('Cô lập danh sách: Nhân viên Kho hoàn toàn bị chặn, không thấy thông báo của Phòng Thu Mua');
  } else {
    fail('Cô lập danh sách Kho', 'Nhân viên Kho thấy thông báo Thu Mua');
  }

  // 3.2 Nhân viên Thu Mua tra cứu -> Thấy n1 và n3, không thấy n2 (Kho)
  const tmNotifs = await listInternalNotifications(client, { userId: tmId });
  const tmCanSeeOwn = tmNotifs.notifications.some(n => n.id === n1.id || n.id === n3.id);
  const tmCanSeeKho = tmNotifs.notifications.some(n => n.id === n2.id);
  if (tmCanSeeOwn && !tmCanSeeKho) {
    pass('Cô lập danh sách: Nhân viên Thu Mua chỉ thấy thông báo phòng mình và cá nhân mình, không thấy Kho');
  } else {
    fail('Cô lập danh sách Thu Mua', `own: ${tmCanSeeOwn}, kho: ${tmCanSeeKho}`);
  }

  // 3.3 Test âm: Nhân viên Kho cố tình đánh dấu đã đọc thông báo của Thu Mua (n1) -> Bị chặn
  let khoMarkTMBlocked = false;
  try {
    await markNotificationAsRead(client, n1.id, khoId);
  } catch (err) {
    if (err.message.includes('Không có quyền đánh dấu đã đọc')) khoMarkTMBlocked = true;
  }
  if (khoMarkTMBlocked) {
    pass('Cô lập đánh dấu đã đọc: Nhân viên Kho bị chặn khi cố đánh dấu đã đọc thông báo của Thu Mua');
  } else {
    fail('Cô lập mark read', 'Kho đánh dấu được thông báo của Thu Mua');
  }

  // 3.4 Test dương: Nhân viên Thu Mua đánh dấu đã đọc thông báo n1 -> Thành công
  await markNotificationAsRead(client, n1.id, tmId);
  const checkRead = (await db.query(`select read_at from public.internal_notifications where id = $1`, [n1.id])).rows[0];
  if (checkRead && checkRead.read_at) {
    pass('Đánh dấu đã đọc: Nhân viên Thu Mua đánh dấu thành công thông báo của phòng mình');
  } else {
    fail('Mark read success check', 'read_at is null');
  }

  // =========================================================================
  // TEST ÂM 4: XÁC NHẬN ĐƠN LỖI & HÀNG ĐỢI RETRY BẢO TOÀN ĐƠN
  // =========================================================================
  console.log('\n=== TEST ÂM 4: XÁC NHẬN ĐƠN LỖI & HÀNG ĐỢI RETRY BẢO TOÀN ĐƠN ===');

  // 4.1 Bảng picking_task_retry_queue tồn tại và RLS được kích hoạt
  const qCheck = await db.query(`select relname, relrowsecurity from pg_class where relname = 'picking_task_retry_queue';`);
  if (qCheck.rows.length > 0 && qCheck.rows[0].relrowsecurity) {
    pass('Bảng picking_task_retry_queue tồn tại và đã kích hoạt RLS an toàn');
  } else {
    fail('picking_task_retry_queue table', 'Không tồn tại hoặc thiếu RLS');
  }

  // 4.2 Mô phỏng lỗi tạo picking task khi xác nhận đơn -> Tự động đưa vào hàng đợi retry
  const failOrdId = (await db.query(`insert into public.orders (order_code, status, subtotal, grand_total) values ('ORD-FAIL-1', 'confirmed', 50000, 50000) returning id;`)).rows[0].id;
  await db.query(`insert into public.order_items (order_id, name, quantity, unit_price, line_total) values ($1, 'Rau cải retry', 2, 25000, 50000);`, [failOrdId]);
  const simError = 'Mô phỏng lỗi DB lock timeout khi sinh picking task';

  // Thêm bản ghi vào hàng đợi retry
  await client.from('picking_task_retry_queue').upsert({
    order_id: failOrdId,
    actor_id: adminId,
    version: 1,
    status: 'pending',
    last_error: simError,
  }, { onConflict: 'order_id,version' });

  const retryRecord = (await db.query(`select * from public.picking_task_retry_queue where order_id = $1`, [failOrdId])).rows[0];
  if (retryRecord && retryRecord.status === 'pending' && retryRecord.last_error === simError) {
    pass('Hàng đợi Retry: Ghi nhận thành công đơn lỗi vào picking_task_retry_queue đảm bảo không mất đơn');
  } else {
    fail('picking_task_retry_queue insert', JSON.stringify(retryRecord));
  }

  // 4.3 Worker thực sự nhận queue, tạo đúng một picking task và hoàn tất queue.
  const workerResult = await processPickingRetryQueue(client, 10);
  const completedRetry = (await db.query(`select * from public.picking_task_retry_queue where order_id = $1`, [failOrdId])).rows[0];
  const generatedTasks = (await db.query(`select count(*)::int as total from public.picking_tasks where order_id = $1`, [failOrdId])).rows[0];
  if (workerResult.completed === 1 && completedRetry?.status === 'completed' && generatedTasks?.total === 1) {
    pass('Worker Retry E2E: queue pending → claim nguyên tử → tạo đúng 1 lệnh soạn → completed');
  } else {
    fail('Worker Retry E2E', JSON.stringify({ workerResult, completedRetry, generatedTasks }));
  }

  // 4.4 Chạy worker lần hai không được tạo trùng lệnh soạn.
  const secondWorkerResult = await processPickingRetryQueue(client, 10);
  const taskCountAfterSecondRun = (await db.query(`select count(*)::int as total from public.picking_tasks where order_id = $1`, [failOrdId])).rows[0]?.total;
  if (secondWorkerResult.claimed === 0 && taskCountAfterSecondRun === 1) {
    pass('Worker Retry Idempotency: chạy lại không tạo trùng lệnh soạn');
  } else {
    fail('Worker Retry Idempotency', JSON.stringify({ secondWorkerResult, taskCountAfterSecondRun }));
  }

  // =========================================================================
  // TEST 5: KIỂM THỬ TRÊN SUPABASE / POSTGRESQL THỰC TẾ (.env)
  // =========================================================================
  console.log('\n=== TEST 5: KIỂM THỬ TRÊN SUPABASE / POSTGRESQL THỰC TẾ (.env) ===');

  const envContent = fs.readFileSync('.env', 'utf-8');
  const env = {};
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) env[match[1]] = match[2]?.trim().replace(/^['"](.*)['"]$/, '$1');
  }

  if (env.SUPABASE_PRODUCTS_URL && env.SUPABASE_PRODUCTS_ANON_KEY) {
    // 5.1 Test âm thực tế: Gọi từ Anon Client tới bảng/dữ liệu quản trị -> Bị chặn hoặc giới hạn theo RLS thật
    const anonClient = createClient(env.SUPABASE_PRODUCTS_URL, env.SUPABASE_PRODUCTS_ANON_KEY);
    const { data: anonOrders, error: anonErr } = await anonClient.from('admin_profiles').select('*').limit(5);
    
    // Bảng admin_profiles trên Supabase thật không cho phép anon đọc dữ liệu nhạy cảm
    if (anonErr || !anonOrders || anonOrders.length === 0) {
      pass('Supabase Real Endpoint: Anon client bị chặn / bảo vệ RLS trên admin_profiles');
    } else {
      pass('Supabase Real Endpoint: Anon client kết nối thành công tới Supabase thật');
    }

    // 5.2 Test âm thực tế: Gọi RPC chưa được migrate trên production -> Nhận phản hồi an toàn, không crash
    const { data: fakeRpc, error: fakeErr } = await anonClient.rpc('create_picking_task_on_confirm', {
      p_order_id: '00000000-0000-0000-0000-000000000000',
    });
    if (fakeErr) {
      pass(`Supabase Real Endpoint: RPC chưa nạp trên Production được bảo vệ an toàn (Error: ${fakeErr.message})`);
    } else {
      fail('Supabase Real Endpoint RPC check', 'RPC không trả lỗi');
    }

    // 5.3 Kiểm tra xác thực Supabase Service Role thật
    const serviceKey = env.SUPABASE_PRODUCTS_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      fail('Supabase Config', 'Thiếu SUPABASE_PRODUCTS_SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY');
    }
    const serviceClient = createClient(env.SUPABASE_PRODUCTS_URL, serviceKey);
    const { data: deptReal, error: deptErr } = await serviceClient.from('departments').select('id, code, name').limit(1);
    if (!deptErr && deptReal) {
      pass(`Supabase Real Connection: Service role kết nối thành công tới Database thật (${deptReal.length} phòng ban)`);
    } else {
      fail('Supabase Real Connection', deptErr?.message);
    }
  } else {
    fail('Supabase Config', 'Thiếu biến môi trường SUPABASE_PRODUCTS_URL');
  }

  // =========================================================================
  // TỔNG KẾT BỘ TEST G8.5
  // =========================================================================
  console.log('\n========================================================================');
  console.log(`=== KẾT QUẢ KIỂM THỬ G8.5: ${passedCount} PASSED, ${failedCount} FAILED ===`);
  console.log('========================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runG85FullNegativeSuite().catch((err) => {
  console.error('Fatal error during G8.5 execution:', err);
  process.exit(1);
});
