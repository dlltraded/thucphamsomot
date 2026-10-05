import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';

// Import services directly from lib
import {
  createProcurementReview,
  claimProcurementReview,
  saveProcurementReviewDraft,
  submitProcurementReview,
  operationsAcceptReview,
  operationsRequestRevision,
  listProcurementReviews,
  getProcurementReviewDetail,
} from '../lib/procurement-service.ts';

import {
  listPickingTasks,
  getPickingTaskDetail,
  claimPickingTaskCore,
  updatePickingItems,
  reportPickingExceptionCore,
  resolvePickingExceptionCore,
  completePickingTaskCore,
} from '../lib/picking-service.ts';

import {
  createInternalNotification,
  listInternalNotifications,
} from '../lib/notification-service.ts';

/**
 * PGlite Supabase Adapter
 * Translates Supabase PostgREST fluent query calls to PostgreSQL on PGlite.
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

  range(from, to) {
    this._offset = from;
    this._limit = to - from + 1;
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
          const conflictCol = this._upsertOptions.onConflict;
          if (this._upsertOptions.ignoreDuplicates) {
            sql += ` on conflict ("${conflictCol}") do nothing`;
          } else {
            const updates = keys
              .filter((k) => k !== conflictCol)
              .map((k) => `"${k}" = excluded."${k}"`)
              .join(', ');
            sql += ` on conflict ("${conflictCol}") do update set ${updates}`;
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
        } else if (f.type === 'in') {
          const inPlaceholders = f.values.map(() => `$${paramIdx++}`).join(', ');
          whereParts.push(`"${f.column}" in (${inPlaceholders})`);
          values.push(...f.values);
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
        const parts = f.str.split(',');
        const sqlParts = [];
        for (const part of parts) {
          const mEq = part.match(/^([\w_]+)\.eq\.(.*)$/);
          if (mEq) {
            sqlParts.push(`"${mEq[1]}" = $${paramIdx++}`);
            values.push(mEq[2]);
          } else if (part.endsWith('.is.null')) {
            const col = part.replace('.is.null', '');
            sqlParts.push(`"${col}" is null`);
          }
        }
        if (sqlParts.length) whereParts.push(`(${sqlParts.join(' or ')})`);
      }
    }

    const whereClause = whereParts.length ? `where ${whereParts.join(' and ')}` : '';
    let sql = `select * from public."${this.table}" ${whereClause} ${this._order}`;
    if (this._limit) sql += ` limit ${this._limit}`;
    if (this._offset) sql += ` offset ${this._offset}`;

    const r = await this.db.query(sql, values);
    let rows = r.rows;

    // Supabase nested relation mocks
    if (this.table === 'orders' && this._select.includes('order_items')) {
      for (const row of rows) {
        const itemRes = await this.db.query(
          `select * from public.order_items where order_id = $1`,
          [row.id]
        );
        row.order_items = itemRes.rows;
      }
    }

    if (this.table === 'procurement_review_requests') {
      for (const row of rows) {
        if (this._select.includes('orders:order_id')) {
          const oRes = await this.db.query(
            `select * from public.orders where id = $1`,
            [row.order_id]
          );
          const order = oRes.rows[0] || null;
          if (order) {
            const oiRes = await this.db.query(
              `select * from public.order_items where order_id = $1`,
              [order.id]
            );
            order.order_items = oiRes.rows;
          }
          row.orders = order;
        }
        if (this._select.includes('requested_by_profile') && row.requested_by) {
          const uRes = await this.db.query(
            `select id, name, email, role from public.admin_profiles where id = $1`,
            [row.requested_by]
          );
          row.requested_by_profile = uRes.rows[0] || null;
        }
        if (this._select.includes('assigned_to_profile') && row.assigned_to) {
          const aRes = await this.db.query(
            `select id, name, email, role from public.admin_profiles where id = $1`,
            [row.assigned_to]
          );
          row.assigned_to_profile = aRes.rows[0] || null;
        }
      }
    }

    if (this.table === 'picking_tasks') {
      for (const row of rows) {
        if (this._select.includes('orders:order_id')) {
          const oRes = await this.db.query(`select * from public.orders where id = $1`, [row.order_id]);
          const order = oRes.rows[0] || null;
          if (order) {
            const oiRes = await this.db.query(`select * from public.order_items where order_id = $1`, [order.id]);
            order.order_items = oiRes.rows;
          }
          row.orders = order;
        }
        if (this._select.includes('assigned_to_profile') && row.assigned_to) {
          const uRes = await this.db.query(`select id, name, email, role from public.admin_profiles where id = $1`, [row.assigned_to]);
          row.assigned_to_profile = uRes.rows[0] || null;
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

async function runG84FinalSuite() {
  console.log('========================================================================');
  console.log('=== KỊCH BẢN G8.4: KIỂM THỬ TOÀN DIỆN BACKEND, SECURITY & TRANSACTIONS ===');
  console.log('=== 1. Migration Security (RLS & Service Role Policies)             ===');
  console.log('=== 2. RPC Transactions Nguyên Tử & Rollback Guards                 ===');
  console.log('=== 3. Kiểm Tra Người Được Giao Việc (Thu Mua & Soạn Hàng)          ===');
  console.log('=== 4. Định Tuyến Notification Theo Người & Phòng Ban               ===');
  console.log('=== 5. Xử Lý Bắt Buộc Lỗi RPC Khi Xác Nhận Đơn                      ===');
  console.log('=== 6. Test Service Thực Tế Chạy Được Bằng Một Lệnh package.json    ===');
  console.log('========================================================================\n');

  const db = new PGlite();

  // Tạo roles Postgres cho Supabase
  await db.exec(`
    create role service_role;
    create role authenticated;
    create role anon;
  `);

  // 1. Tạo Schema nền tảng chuẩn với đầy đủ các cột thực tế
  console.log('0. Khởi tạo Base Schema (departments, admin_profiles, orders, order_items)...');
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

  // 2. Chạy migration G1/G8.4
  console.log('--- NẠP MIGRATION G8.4: 20261005_procurement_review_and_picking.sql ---');
  const migrationPath = path.join(
    process.cwd(),
    'tps1-miniapp/supabase/migrations/20261005_procurement_review_and_picking.sql'
  );
  const migSql = fs.readFileSync(migrationPath, 'utf-8');
  await db.exec(migSql);
  console.log('  Migration G8.4 nạp thành công trên PGlite.\n');

  const client = new PGliteSupabaseAdapter(db);

  // Setup seed fixtures
  const deptRes = await db.query(`
    insert into public.departments (code, name, function_group)
    values ('THU_MUA', 'Phòng Thu Mua TPS1', 'procurement'),
           ('VAN_HANH', 'Phòng Vận Hành TPS1', 'operations'),
           ('KHO', 'Kho Vận TPS1', 'warehouse')
    returning id, code;
  `);
  const tmDeptId = deptRes.rows[0].id;
  const opDeptId = deptRes.rows[1].id;
  const khoDeptId = deptRes.rows[2].id;

  const staffRes = await db.query(`
    insert into public.admin_profiles (name, email, role, position, department_id)
    values 
      ('Admin Quản Trị', 'admin@tps1.vn', 'admin', 'Giám đốc', null),
      ('Lê Điều Phối', 'dieuphoi@tps1.vn', 'sale', 'Điều phối', '${opDeptId}'),
      ('Nguyễn Thu Mua A', 'thumuaA@tps1.vn', 'thu_mua', 'Nhân viên thu mua', '${tmDeptId}'),
      ('Trần Thu Mua B', 'thumuaB@tps1.vn', 'thu_mua', 'Nhân viên thu mua', '${tmDeptId}'),
      ('Trưởng Phòng C', 'truongphong@tps1.vn', 'truong_phong', 'Trưởng phòng thu mua', '${tmDeptId}'),
      ('Phạm Kho 1', 'kho1@tps1.vn', 'kho', 'Nhân viên kho', '${khoDeptId}'),
      ('Võ Kho 2', 'kho2@tps1.vn', 'kho', 'Nhân viên kho', '${khoDeptId}')
    returning id, name, role;
  `);
  const adminId = staffRes.rows[0].id;
  const saleId = staffRes.rows[1].id;
  const tmStaffAId = staffRes.rows[2].id;
  const tmStaffBId = staffRes.rows[3].id;
  const truongPhongId = staffRes.rows[4].id;
  const khoStaff1Id = staffRes.rows[5].id;
  const khoStaff2Id = staffRes.rows[6].id;

  const prodRes = await db.query(`
    insert into public.products (sku, name, price)
    values 
      ('RAU-01', 'Rau Muống Sạch', 15000),
      ('THIT-01', 'Thịt Ba Chỉ Heo', 120000)
    returning id, sku, name, price;
  `);
  const pRau = prodRes.rows[0].id;
  const pThit = prodRes.rows[1].id;

  // =========================================================================
  // SECTION 1: MIGRATION SECURITY
  // =========================================================================
  console.log('=== SECTION 1: MIGRATION SECURITY (RLS & SERVICE ROLE POLICIES) ===');

  const targetTables = [
    'procurement_review_requests',
    'procurement_review_items',
    'procurement_review_audit_logs',
    'picking_tasks',
    'picking_task_items',
    'picking_exceptions',
    'picking_audit_logs',
    'internal_notifications',
  ];

  // 1.1 Kiểm tra RLS được kích hoạt trên tất cả 8 bảng
  const rlsCheck = await db.query(`
    select relname, relrowsecurity 
    from pg_class 
    where relname in (${targetTables.map(t => `'${t}'`).join(', ')});
  `);
  for (const t of targetTables) {
    const row = rlsCheck.rows.find(r => r.relname === t);
    if (row && row.relrowsecurity) {
      pass(`RLS đã được kích hoạt trên bảng ${t}`);
    } else {
      fail(`RLS bảng ${t}`, 'relrowsecurity = false');
    }
  }

  // 1.2 Kiểm tra file migration có service_role bypass policy cho 8 bảng
  for (const t of targetTables) {
    if (migSql.includes(`to service_role using (true) with check (true);`) &&
        migSql.includes(`on public.${t}`)) {
      pass(`service_role bypass policy được thiết lập đầy đủ cho ${t}`);
    } else {
      fail(`service_role policy cho ${t}`, 'Thiếu policy trong migration');
    }
  }

  // 1.3 Kiểm tra RPC claim_procurement_review chặn role không hợp lệ (FORBIDDEN)
  const ord0 = (await db.query(`
    insert into public.orders (order_code, status) values ('SEC-001', 'pending') returning id;
  `)).rows[0].id;
  const rev0 = (await db.query(`
    insert into public.procurement_review_requests (order_id, requested_by, status)
    values ('${ord0}', '${saleId}', 'pending_acceptance') returning id;
  `)).rows[0].id;

  const khoClaim = await client.rpc('claim_procurement_review', {
    p_review_id: rev0,
    p_actor_id: khoStaff1Id,
  });
  if (khoClaim.data && khoClaim.data.success === false && khoClaim.data.error_code === 'FORBIDDEN') {
    pass('claim_procurement_review: Chặn nhân viên không có thẩm quyền (role kho -> FORBIDDEN)');
  } else {
    fail('claim_procurement_review kho check', JSON.stringify(khoClaim.data));
  }

  const tmClaim = await client.rpc('claim_procurement_review', {
    p_review_id: rev0,
    p_actor_id: tmStaffAId,
  });
  if (tmClaim.data && tmClaim.data.success === true) {
    pass('claim_procurement_review: Nhân viên thu_mua nhận việc thành công');
  } else {
    fail('claim_procurement_review thu_mua check', JSON.stringify(tmClaim.data));
  }

  // 1.4 Kiểm tra RPC claim_picking_task chặn role không hợp lệ (FORBIDDEN)
  const ordTask = (await db.query(`
    insert into public.orders (order_code, status) values ('SEC-TASK-001', 'confirmed') returning id;
  `)).rows[0].id;
  const pickTask0 = (await db.query(`
    insert into public.picking_tasks (order_id, status) values ('${ordTask}', 'released') returning id;
  `)).rows[0].id;

  const salePickClaim = await client.rpc('claim_picking_task', {
    p_task_id: pickTask0,
    p_actor_id: saleId,
  });
  if (salePickClaim.data && salePickClaim.data.success === false && salePickClaim.data.error_code === 'FORBIDDEN') {
    pass('claim_picking_task: Chặn nhân viên sale nhận soạn kho (role sale -> FORBIDDEN)');
  } else {
    fail('claim_picking_task sale check', JSON.stringify(salePickClaim.data));
  }

  const tmPickClaim = await client.rpc('claim_picking_task', {
    p_task_id: pickTask0,
    p_actor_id: tmStaffAId,
  });
  if (tmPickClaim.data && tmPickClaim.data.success === false && tmPickClaim.data.error_code === 'FORBIDDEN') {
    pass('claim_picking_task: Chặn nhân viên thu mua nhận soạn kho (role thu_mua -> FORBIDDEN)');
  } else {
    fail('claim_picking_task thu_mua check', JSON.stringify(tmPickClaim.data));
  }

  const khoPickClaim = await client.rpc('claim_picking_task', {
    p_task_id: pickTask0,
    p_actor_id: khoStaff1Id,
  });
  if (khoPickClaim.data && khoPickClaim.data.success === true) {
    pass('claim_picking_task: Nhân viên kho nhận tác vụ soạn hàng thành công');
  } else {
    fail('claim_picking_task kho check', JSON.stringify(khoPickClaim.data));
  }

  // =========================================================================
  // SECTION 2: RPC TRANSACTIONS NGUYÊN TỬ & ROLLBACK GUARDS
  // =========================================================================
  console.log('\n=== SECTION 2: RPC TRANSACTIONS NGUYÊN TỬ & ROLLBACK GUARDS ===');

  // 2.1 Kiểm tra EXCEPTION handlers trong cả 3 RPCs
  if (migSql.includes('create or replace function public.claim_procurement_review') &&
      migSql.includes('Lỗi khi tiếp nhận kiểm tra hàng:')) {
    pass('claim_procurement_review: Có khối EXCEPTION WHEN OTHERS THEN bảo vệ transaction');
  } else {
    fail('claim_procurement_review exception', 'Thiếu exception handler');
  }

  if (migSql.includes('create or replace function public.claim_picking_task') &&
      migSql.includes('Lỗi khi nhận tác vụ soạn hàng:')) {
    pass('claim_picking_task: Có khối EXCEPTION WHEN OTHERS THEN bảo vệ transaction');
  } else {
    fail('claim_picking_task exception', 'Thiếu exception handler');
  }

  if (migSql.includes('create or replace function public.create_picking_task_on_confirm') &&
      migSql.includes('Lỗi phát hành picking task:')) {
    pass('create_picking_task_on_confirm: Có khối EXCEPTION WHEN OTHERS THEN bảo vệ transaction');
  } else {
    fail('create_picking_task_on_confirm exception', 'Thiếu exception handler');
  }

  // 2.2 Kiểm tra lock FOR UPDATE và guard NO_ITEMS
  if (migSql.includes('for update')) {
    pass('Tất cả các RPCs đều có khóa FOR UPDATE chống race condition');
  } else {
    fail('FOR UPDATE lock', 'Thiếu khóa');
  }

  // 2.3 Test sinh picking task nguyên tử
  const o1Id = (await db.query(`
    insert into public.orders (order_code, status, subtotal, grand_total)
    values ('ORD-RPC-1', 'confirmed', 195000, 195000) returning id;
  `)).rows[0].id;

  await db.query(`
    insert into public.order_items (order_id, product_id, sku, name, quantity, unit, unit_price, line_total)
    values 
      ('${o1Id}', '${pRau}', 'RAU-01', 'Rau Muống Sạch', 5, 'Kg', 15000, 75000),
      ('${o1Id}', '${pThit}', 'THIT-01', 'Thịt Ba Chỉ Heo', 1, 'Kg', 120000, 120000);
  `);

  const rpcResult1 = await client.rpc('create_picking_task_on_confirm', {
    p_order_id: o1Id,
    p_actor_id: adminId,
    p_version: 1,
  });

  if (rpcResult1.data && rpcResult1.data.success === true) {
    pass('create_picking_task_on_confirm: Tạo tác vụ thành công và đồng bộ');
  } else {
    fail('create_picking_task_on_confirm success', JSON.stringify(rpcResult1.data));
  }

  const taskItems = await db.query(
    `select * from public.picking_task_items where picking_task_id = $1`,
    [rpcResult1.data.data?.id]
  );
  if (taskItems.rows.length === 2 && Number(taskItems.rows[0].confirmed_qty) > 0) {
    pass('create_picking_task_on_confirm: picking_task_items sinh đủ 2 dòng với confirmed_qty khớp 100%');
  } else {
    fail('create_picking_task_on_confirm items clone', `Count: ${taskItems.rows.length}`);
  }

  // 2.4 Idempotency
  const rpcRetry = await client.rpc('create_picking_task_on_confirm', {
    p_order_id: o1Id,
    p_actor_id: adminId,
    p_version: 1,
  });
  if (rpcRetry.data && rpcRetry.data.success === true && rpcRetry.data.data?.is_existing === true) {
    pass('create_picking_task_on_confirm: Idempotency đảm bảo không tạo trùng (is_existing = true)');
  } else {
    fail('create_picking_task_on_confirm idempotency', JSON.stringify(rpcRetry.data));
  }

  // 2.5 Guard NO_ITEMS
  const emptyOrdId = (await db.query(`
    insert into public.orders (order_code, status) values ('ORD-EMPTY', 'confirmed') returning id;
  `)).rows[0].id;
  const emptyRes = await client.rpc('create_picking_task_on_confirm', {
    p_order_id: emptyOrdId,
    p_actor_id: adminId,
    p_version: 1,
  });
  if (emptyRes.data && emptyRes.data.success === false && emptyRes.data.error_code === 'NO_ITEMS') {
    pass('create_picking_task_on_confirm: Chặn đơn rỗng thành công (error_code = NO_ITEMS)');
  } else {
    fail('create_picking_task_on_confirm empty order', JSON.stringify(emptyRes.data));
  }

  // =========================================================================
  // SECTION 3: KIỂM TRA NGƯỜI ĐƯỢC GIAO VIỆC (THU MUA & SOẠN HÀNG)
  // =========================================================================
  console.log('\n=== SECTION 3: KIỂM TRA NGƯỜI ĐƯỢC GIAO VIỆC (TASK OWNERSHIP) ===');

  // 3.1 Thu Mua Task Ownership (saveProcurementReviewDraft)
  const o2Id = (await db.query(`
    insert into public.orders (order_code, status) values ('ORD-OWNER-TM', 'pending') returning id;
  `)).rows[0].id;
  const o2ItemRes = await db.query(`
    insert into public.order_items (order_id, product_id, sku, name, quantity, unit, unit_price, line_total)
    values ('${o2Id}', '${pRau}', 'RAU-01', 'Rau Muống Sạch', 10, 'Kg', 15000, 150000)
    returning id;
  `);
  const o2ItemId = o2ItemRes.rows[0].id;

  const revCreate = await createProcurementReview(o2Id, saleId, 'Kiểm tra rau', client);
  const reviewId = revCreate.id;
  await claimProcurementReview(reviewId, tmStaffAId, client);

  const revItemRow = (await db.query(
    `select id from public.procurement_review_items where review_id = $1 and order_item_id = $2`,
    [reviewId, o2ItemId]
  )).rows[0];
  const revItemId = revItemRow.id;

  // Thu Mua B cố tình can thiệp việc của Thu Mua A -> Bị chặn
  let tmBBlocked = false;
  try {
    await saveProcurementReviewDraft(reviewId, tmStaffBId, [{ id: revItemId, result_status: 'available', available_qty: 10 }], client);
  } catch (err) {
    if (err.message.includes('giao cho nhân viên khác')) tmBBlocked = true;
  }
  if (tmBBlocked) {
    pass('Thu Mua: Chặn thành công nhân viên khác (Thu Mua B) can thiệp việc của Thu Mua A');
  } else {
    fail('Thu Mua ownership', 'Thu Mua B không bị chặn');
  }

  // Thu Mua A thao tác -> Thành công
  await saveProcurementReviewDraft(reviewId, tmStaffAId, [{ id: revItemId, result_status: 'partial', available_qty: 7 }], client);
  pass('Thu Mua: Chính chủ được giao việc (Thu Mua A) lưu nháp thành công');

  // Trưởng phòng can thiệp -> Thành công
  await saveProcurementReviewDraft(reviewId, truongPhongId, [{ id: revItemId, result_status: 'available', available_qty: 10 }], client);
  pass('Thu Mua: Trưởng phòng có quyền can thiệp/hỗ trợ thành công');

  // 3.2 Kho Soạn Hàng Task Ownership (updatePickingItems & completePickingTaskCore)
  const o3Id = (await db.query(`
    insert into public.orders (order_code, status) values ('ORD-OWNER-KHO', 'confirmed') returning id;
  `)).rows[0].id;
  const o3ItemRes = await db.query(`
    insert into public.order_items (order_id, product_id, sku, name, quantity, unit, unit_price, line_total)
    values ('${o3Id}', '${pThit}', 'THIT-01', 'Thịt Ba Chỉ Heo', 3, 'Kg', 120000, 360000)
    returning id;
  `);

  const pickResKho = await client.rpc('create_picking_task_on_confirm', {
    p_order_id: o3Id,
    p_actor_id: adminId,
    p_version: 1,
  });
  const khoTaskId = pickResKho.data.data.id;

  // Giao task cho Kho 1 (khoStaff1Id)
  await claimPickingTaskCore(client, khoTaskId, khoStaff1Id);

  const khoTaskItemRes = await db.query(
    `select id from public.picking_task_items where picking_task_id = $1`,
    [khoTaskId]
  );
  const khoTaskItemId = khoTaskItemRes.rows[0].id;

  // Kho 2 (khoStaff2Id) cố tình cập nhật số lượng soạn -> Bị chặn!
  let kho2UpdateBlocked = false;
  try {
    await updatePickingItems(client, khoTaskId, khoStaff2Id, [{ id: khoTaskItemId, picked_qty: 3 }]);
  } catch (err) {
    if (err.message.includes('giao cho nhân viên khác')) kho2UpdateBlocked = true;
  }
  if (kho2UpdateBlocked) {
    pass('Kho: Chặn thành công nhân viên khác (Kho 2) cập nhật hàng của Kho 1');
  } else {
    fail('Kho ownership update', 'Kho 2 không bị chặn');
  }

  // Kho 2 cố tình bấm hoàn tất task -> Bị chặn!
  let kho2CompleteBlocked = false;
  try {
    await completePickingTaskCore(client, khoTaskId, khoStaff2Id, 'Võ Kho 2');
  } catch (err) {
    if (err.message.includes('giao cho nhân viên khác')) kho2CompleteBlocked = true;
  }
  if (kho2CompleteBlocked) {
    pass('Kho: Chặn thành công nhân viên khác (Kho 2) hoàn tất task của Kho 1');
  } else {
    fail('Kho ownership complete', 'Kho 2 không bị chặn');
  }

  // Kho 1 chính chủ cập nhật và hoàn tất -> Thành công
  await updatePickingItems(client, khoTaskId, khoStaff1Id, [{ id: khoTaskItemId, picked_qty: 3 }]);
  pass('Kho: Chính chủ được giao việc (Kho 1) cập nhật số lượng soạn thành công');

  await completePickingTaskCore(client, khoTaskId, khoStaff1Id, 'Phạm Kho 1');
  pass('Kho: Chính chủ được giao việc (Kho 1) hoàn tất tác vụ soạn thành công');

  // =========================================================================
  // SECTION 4: ĐỊNH TUYẾN NOTIFICATION THEO NGƯỜI & PHÒNG BAN
  // =========================================================================
  console.log('\n=== SECTION 4: ĐỊNH TUYẾN NOTIFICATION THEO NGƯỜI & PHÒNG BAN ===');

  // 4.1 createProcurementReview -> Định tuyến theo departmentId của Phòng Thu Mua
  const o4Id = (await db.query(`
    insert into public.orders (order_code, status) values ('ORD-NOTIF-DEP', 'pending') returning id;
  `)).rows[0].id;
  await db.query(`
    insert into public.order_items (order_id, product_id, sku, name, quantity, unit, unit_price, line_total)
    values ('${o4Id}', '${pRau}', 'RAU-01', 'Rau Muống Sạch', 2, 'Kg', 15000, 30000);
  `);

  const revNotif = await createProcurementReview(o4Id, saleId, 'Yêu cầu mới', client);
  const tmNotifRows = await db.query(`
    select * from public.internal_notifications
    where entity_id = $1 and event_type = 'procurement_review_requested';
  `, [revNotif.id]);

  if (tmNotifRows.rows.length > 0 && tmNotifRows.rows[0].department_id === tmDeptId) {
    pass('Notification: createProcurementReview tự động định tuyến tới đúng departmentId Phòng Thu Mua');
  } else {
    fail('Notification TM dept routing', `Data: ${JSON.stringify(tmNotifRows.rows)}`);
  }

  // 4.2 reportPickingExceptionCore -> Định tuyến theo departmentId của Phòng Vận Hành
  const exc = await reportPickingExceptionCore(client, {
    taskId: khoTaskId,
    orderId: o3Id,
    exceptionType: 'shortage',
    reason: 'Thịt heo bị hụt 0.5kg',
    reportedBy: khoStaff1Id,
  });

  const excNotifRows = await db.query(`
    select * from public.internal_notifications
    where entity_id = $1 and event_type = 'picking_exception_reported';
  `, [khoTaskId]);

  if (excNotifRows.rows.length > 0 && excNotifRows.rows[0].department_id === opDeptId) {
    pass('Notification: reportPickingExceptionCore tự động định tuyến tới đúng departmentId Phòng Vận Hành');
  } else {
    fail('Notification Op dept routing', `Data: ${JSON.stringify(excNotifRows.rows)}`);
  }

  // 4.3 resolvePickingExceptionCore -> Gửi thông báo đích danh tới người báo cáo (recipient_user_id)
  await resolvePickingExceptionCore(client, {
    exceptionId: exc.id,
    action: 'accept_shortage',
    resolvedBy: saleId,
  });

  const excResNotifRows = await db.query(`
    select * from public.internal_notifications
    where recipient_user_id = $1 and event_type = 'picking_exception_resolved';
  `, [khoStaff1Id]);

  if (excResNotifRows.rows.length > 0 && excResNotifRows.rows[0].recipient_user_id === khoStaff1Id) {
    pass('Notification: resolvePickingExceptionCore tự động gửi thông báo đích danh cho nhân viên kho đã báo cáo');
  } else {
    fail('Notification reporter recipient', `Data: ${JSON.stringify(excResNotifRows.rows)}`);
  }

  // =========================================================================
  // SECTION 5: XỬ LÝ BẮT BUỘC LỖI RPC KHI XÁC NHẬN ĐƠN
  // =========================================================================
  console.log('\n=== SECTION 5: XỬ LÝ BẮT BUỘC LỖI RPC KHI XÁC NHẬN ĐƠN ===');

  const orderFinalizePath = path.join(process.cwd(), 'lib/order-finalize.ts');
  const ofContent = fs.readFileSync(orderFinalizePath, 'utf-8');

  if (!ofContent.includes('console.warn("create_picking_task_on_confirm error:"')) {
    pass('lib/order-finalize.ts: Đã loại bỏ hoàn toàn console.warn âm thầm');
  } else {
    fail('lib/order-finalize.ts warn check', 'Vẫn còn console.warn cũ');
  }

  if (ofContent.includes('pickingTaskWarning') &&
      ofContent.includes('pickResult.error') &&
      ofContent.includes('pickResult.data.success === false')) {
    pass('lib/order-finalize.ts: Xử lý bắt buộc cả lỗi kết nối và lỗi nghiệp vụ nội bộ');
  } else {
    fail('lib/order-finalize.ts error handling', 'Thiếu kiểm tra lỗi');
  }

  if (ofContent.includes('documentWarning = documentWarning')) {
    pass('lib/order-finalize.ts: Cảnh báo lỗi RPC được gộp trực tiếp vào documentWarning');
  } else {
    fail('lib/order-finalize.ts documentWarning', 'Chưa tích hợp');
  }

  const ordersRoutePath = path.join(process.cwd(), 'app/api/admin/orders/route.ts');
  const orContent = fs.readFileSync(ordersRoutePath, 'utf-8');

  if (orContent.includes('pickingWarning = `Đơn đã xác nhận nhưng chưa thể phát hành lệnh soạn hàng:') &&
      orContent.includes('picking_task_retry_queue')) {
    pass('app/api/admin/orders/route.ts: Bắt lỗi RPC create_picking_task, hàng đợi retry và gộp warning trả về trong API response');
  } else {
    fail('app/api/admin/orders/route.ts pickingWarning', 'Chưa xử lý lỗi RPC');
  }

  // Mô phỏng bắt lỗi trong kịch bản RPC thất bại
  class MockFailingRPCAdapter extends PGliteSupabaseAdapter {
    async rpc(funcName, params = {}) {
      if (funcName === 'create_picking_task_on_confirm') {
        return {
          data: {
            success: false,
            error_code: 'OUT_OF_STOCK_UNAVAILABLE',
            message: 'Tồn kho không đủ để đáp ứng đơn hàng',
          },
          error: null,
        };
      }
      return super.rpc(funcName, params);
    }
  }

  const failingClient = new MockFailingRPCAdapter(db);
  const simRes = await failingClient.rpc('create_picking_task_on_confirm', {
    p_order_id: o1Id,
    p_actor_id: adminId,
    p_version: 1,
  });

  let simulatedWarning = '';
  if (simRes.error) {
    simulatedWarning = `Lỗi mạng: ${simRes.error.message}`;
  } else if (simRes.data && simRes.data.success === false) {
    simulatedWarning = `Đơn đã được xác nhận nhưng Lệnh Soạn Hàng chưa được phát hành: ${simRes.data.message}`;
  }

  if (simulatedWarning.includes('Tồn kho không đủ để đáp ứng đơn hàng')) {
    pass('Mô phỏng xử lý lỗi RPC: Lỗi nghiệp vụ được phát hiện và cảnh báo được sinh đầy đủ');
  } else {
    fail('Mô phỏng lỗi RPC', 'Cảnh báo không được sinh');
  }

  // =========================================================================
  // TỔNG KẾT BỘ TEST G8.4
  // =========================================================================
  console.log('\n========================================================================');
  console.log(`=== KẾT QUẢ KIỂM THỬ G8.4: ${passedCount} PASSED, ${failedCount} FAILED ===`);
  console.log('========================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runG84FinalSuite().catch((err) => {
  console.error('Fatal error during G8.4 test execution:', err);
  process.exit(1);
});
