// Chạy: npm run test:catalog-cache
import { test } from "node:test";
import assert from "node:assert/strict";
import { createCustomerCatalogCache } from "../lib/customer-catalog-cache.ts";

const SHORT_DESCRIPTION_INDEX = 14;
const PRICE_INDEX = 5;

// Bảng products giả, dùng chung cho mọi "instance" như Supabase thật.
function createFakeDb() {
  let tick = 0;
  const rows = [
    { id: "p1", sku: "h-baroi", name: "Ba rọi heo", unit: "Kg", price_retail: 150000, short_description: null, packaging_note: "Khay 1kg", min_order_qty: 1, order_step: 0.5, updated_at: tick },
    { id: "p2", sku: "h1-baroi", name: "Ba rọi heo loại 1", unit: "Kg", price_retail: 165000, short_description: null, updated_at: tick },
  ];
  const stats = { productLoads: 0, versionReads: 0 };
  return {
    stats,
    update(sku, patch) {
      const row = rows.find((item) => item.sku === sku);
      Object.assign(row, patch, { updated_at: ++tick }); // trigger set_updated_at
    },
    async readVersion() {
      stats.versionReads += 1;
      return `${rows.length}:${Math.max(...rows.map((row) => row.updated_at))}`;
    },
    async loadProducts() {
      stats.productLoads += 1;
      return rows.map(({ updated_at, ...row }) => ({ ...row }));
    },
  };
}

function createInstance(db, clock, extra = {}) {
  return createCustomerCatalogCache({
    readVersion: () => db.readVersion(),
    loadProducts: () => db.loadProducts(),
    resolvePrices: async (products) => new Map(products.map((product) => [product.id, { price: Number(product.price_retail) - 10000 }])),
    imageBaseUrl: () => "",
    now: () => clock.now,
    ...extra,
  });
}

const item = (body, sku) => body.items.find((tuple) => tuple[1] === sku);

test("cache đang giữ null, sau khi lưu mô tả thì mọi instance trả mô tả mới", async () => {
  const db = createFakeDb();
  const clock = { now: 0 };
  const instanceA = createInstance(db, clock);
  const instanceB = createInstance(db, clock);
  const customer = { customerId: "kh-1" };

  // Cả hai instance đã cache danh mục khi h-baroi chưa có mô tả.
  for (const instance of [instanceA, instanceB]) {
    const first = await instance.get(customer);
    assert.equal(first.cacheStatus, "MISS");
    assert.equal(item(first.body, "h-baroi")[SHORT_DESCRIPTION_INDEX], null);
    assert.equal((await instance.get(customer)).cacheStatus, "HIT");
  }

  // Admin lưu mô tả qua instance A (PATCH /api/admin/products gọi invalidate).
  db.update("h-baroi", { short_description: "Ba rọi heo tươi siêu nạc" });
  instanceA.invalidate();

  const fromA = await instanceA.get(customer);
  assert.equal(item(fromA.body, "h-baroi")[SHORT_DESCRIPTION_INDEX], "Ba rọi heo tươi siêu nạc");

  // Instance B không nhận lệnh invalidate; vẫn TTL 5 phút nhưng chỉ cần qua
  // khoảng hỏi phiên bản (5 giây) là thấy DB đã đổi.
  clock.now += 5_000;
  const fromB = await instanceB.get(customer);
  assert.equal(fromB.cacheStatus, "MISS");
  assert.equal(fromB.version, fromA.version);
  assert.equal(item(fromB.body, "h-baroi")[SHORT_DESCRIPTION_INDEX], "Ba rọi heo tươi siêu nạc");

  // h1-baroi là mã riêng: không được "mượn" mô tả của h-baroi.
  assert.equal(item(fromB.body, "h1-baroi")[SHORT_DESCRIPTION_INDEX], null);
});

test("giữ nguyên giá theo khách và quy cách khi tải lại theo phiên bản", async () => {
  const db = createFakeDb();
  const clock = { now: 0 };
  const instance = createInstance(db, clock);

  const before = await instance.get({ customerId: "kh-1" });
  db.update("h-baroi", { short_description: "Ba rọi heo tươi siêu nạc" });
  clock.now += 5_000;
  const after = await instance.get({ customerId: "kh-1" });

  const tuple = item(after.body, "h-baroi");
  assert.equal(tuple[PRICE_INDEX], 140000);
  assert.deepEqual(tuple.slice(8, 14), item(before.body, "h-baroi").slice(8, 14));
  assert.equal(after.body.count, 2);

  const guest = await instance.get(null);
  assert.equal(item(guest.body, "h-baroi")[PRICE_INDEX], 150000);
});

test("không đổi phiên bản thì không tải lại bảng products", async () => {
  const db = createFakeDb();
  const clock = { now: 0 };
  const instance = createInstance(db, clock);

  await instance.get({ customerId: "kh-1" });
  clock.now += 60_000;
  assert.equal((await instance.get({ customerId: "kh-1" })).cacheStatus, "HIT");
  await instance.get({ customerId: "kh-2" });
  assert.equal(db.stats.productLoads, 1);

  // Hỏi phiên bản tối đa một lần mỗi 5 giây, kể cả khi có nhiều request.
  const reads = db.stats.versionReads;
  await Promise.all([instance.get({ customerId: "kh-1" }), instance.get({ customerId: "kh-2" })]);
  assert.equal(db.stats.versionReads, reads);
});

test("vẫn hết hạn sau TTL 5 phút như trước", async () => {
  const db = createFakeDb();
  const clock = { now: 0 };
  const instance = createInstance(db, clock);

  await instance.get(null);
  clock.now += 5 * 60_000;
  assert.equal((await instance.get(null)).cacheStatus, "MISS");
  assert.equal(db.stats.productLoads, 2);
});

test("không đọc được phiên bản thì rơi về TTL, không làm hỏng danh mục", async () => {
  const db = createFakeDb();
  const clock = { now: 0 };
  const originalError = console.error;
  console.error = () => {};
  try {
    const instance = createInstance(db, clock, { readVersion: async () => { throw new Error("column updated_at does not exist"); } });
    const first = await instance.get(null);
    assert.equal(first.body.count, 2);
    clock.now += 60_000;
    assert.equal((await instance.get(null)).cacheStatus, "HIT");
    clock.now += 5 * 60_000;
    assert.equal((await instance.get(null)).cacheStatus, "MISS");
  } finally {
    console.error = originalError;
  }
});
