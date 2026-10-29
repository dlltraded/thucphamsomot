import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('status aggregation, date boundaries, latest claim and RPC permissions', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE orders(status text, created_at timestamptz);
      CREATE TABLE order_history(id uuid, order_id uuid, action text, actor text, payload jsonb, created_at timestamptz);
      INSERT INTO orders VALUES ('pending','2026-10-01'),('pending','2026-10-02'),('completed','2026-09-01'),('merged','2026-10-02');
      INSERT INTO order_history VALUES
      ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','processing_claimed','old','{}','2026-10-01'),
      ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','processing_claimed','new','{}','2026-10-02');`);
    await db.exec(await readFile(new URL('../docs/sql/20261029_order_list_performance.sql', import.meta.url), 'utf8'));
    const stats = await db.query(`SELECT admin_order_status_counts('2026-10-01','2026-10-02') AS stats`);
    assert.deepEqual(stats.rows[0].stats, { pending: 2, preparing: 0, shipping: 0, completed: 0 });
    const claims = await db.query(`SELECT * FROM admin_latest_order_claims(ARRAY['00000000-0000-0000-0000-000000000003']::uuid[])`);
    assert.equal(claims.rows.length, 1);
    assert.equal(claims.rows[0].actor, 'new');
    const grants = await db.query(`SELECT has_function_privilege('authenticated','admin_latest_order_claims(uuid[])','EXECUTE') AS allowed`);
    assert.equal(grants.rows[0].allowed, false);
  } finally { await db.close(); }
});
