#!/usr/bin/env node
/**
 * scripts/sync-kiotviet-products.mjs
 *
 * Đồng bộ file "Danh sách hàng hóa" xuất từ KiotViet (.xlsx) vào bảng
 * public.products trên Supabase — bảng mà PosCreatePage (sale-webapp) và
 * Mini App dùng để tìm/bán hàng.
 *
 * Chạy được nhiều lần (idempotent), khớp dòng theo "Mã hàng" (cột sku).
 * KHÔNG bao giờ tự ghi đè giá bán bằng 0 — nếu KiotViet để Giá bán = 0
 * cho một mã hàng đã có giá trong hệ thống, script giữ nguyên giá cũ.
 *
 * Cách dùng (chạy trên máy có kết nối internet, không phải trong sandbox):
 *   npm install                       # để cài gói "xlsx" mới thêm
 *   node --env-file=.env scripts/sync-kiotviet-products.mjs "duong/dan/DanhSachSanPham.xlsx"
 *   node --env-file=.env scripts/sync-kiotviet-products.mjs "duong/dan/DanhSachSanPham.xlsx" --apply
 *
 * Mặc định là chế độ XEM TRƯỚC (dry-run): chỉ in ra sẽ thêm/sửa bao nhiêu
 * dòng, KHÔNG ghi gì vào Supabase. Phải thêm --apply mới ghi thật.
 *
 * Yêu cầu trong .env: SUPABASE_PRODUCTS_URL và
 * (SUPABASE_PRODUCTS_SERVICE_ROLE_KEY hoặc SUPABASE_SERVICE_ROLE_KEY).
 */

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

// Map "Nhóm hàng" bên KiotViet sang tên category dùng trong hệ thống TPS1.
// Sửa/thêm dòng ở đây khi KiotViet có nhóm hàng mới mà chưa được map.
const CATEGORY_MAP = {
  'CÔNG CỤ DỤNG CỤ ĐK': 'Công cụ dụng cụ',
  'MẶT HÀNG NONFOOD ĐK': 'Nonfood',
  'MẶT HÀNG ĐỒ KHÔ ĐK': 'Đồ khô',
  'MẶT HÀNG BÁNH SỮA ĐK': 'Bánh sữa',
  'MẶT HÀNG GIA VỊ ĐK': 'Gia vị',
  'MẶT HÀNG HẢI SẢN TS': 'Hải sản',
  'RAU CỦ QUẢ TS': 'Rau củ quả',
  'MẶT HÀNG THỊT HEO TS': 'Thịt heo',
  'MẶT HÀNG THỊT HEO CP': 'Thịt heo',
  'MẶT HÀNG TRÁI CÂY TS': 'Trái cây',
  'MẶT HÀNG ĐÔNG LẠNH TS': 'Đông lạnh',
  'MẶT HÀNG GÀ, VỊT TS': 'Gà, vịt',
  'MẶT HÀNG CHAY, CHẠO, CHẢ GIÒ ĐK': 'Chay, chả giò',
  'MẶT HÀNG THỊT BÒ TƯƠI TS': 'Thịt bò',
  'MẶT HÀNG BÚN BIÊN HÒA TS': 'Bún tươi',
  'MẶT HÀNG TRỨNG ĐK': 'Trứng',
  'MẶT HÀNG GẠO ĐK': 'Gạo',
  'MẶT HÀNG ĐẬU HŨ TS': 'Đậu hũ',
  'MẶT HÀNG BÚN PHÚ MỸ TS': 'Bún tươi',
};

// Nhóm hàng "...TS" (Tươi Sống) = soạn hàng theo ngày, KHÔNG lưu kho -> không
// theo dõi tồn kho. Nhóm "...ĐK"/"CP" = bảo quản qua ngày -> có theo dõi.
// Ngoại lệ: "Đông Lạnh" tuy hậu tố TS nhưng có trữ đông qua ngày như gia vị/đồ
// khô -> vẫn tính là có theo dõi tồn kho (xác nhận với chủ hệ thống 2026-09-10).
const NO_INVENTORY_TRACKING_EXCEPT = new Set(['MẶT HÀNG ĐÔNG LẠNH TS']);
function resolveTrackInventory(kiotGroup) {
  if (!kiotGroup) return true;
  if (NO_INVENTORY_TRACKING_EXCEPT.has(kiotGroup)) return true;
  return !kiotGroup.trim().toUpperCase().endsWith('TS');
}

function normalizeUnit(u) {
  if (!u) return 'Kg';
  const s = String(u).trim();
  if (!s) return 'Kg';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function firstImageUrl(cell) {
  if (!cell) return null;
  const first = String(cell).split(',')[0].trim();
  return first || null;
}

function slugifyLocalId(sku) {
  return 'kv_' + String(sku).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const args = process.argv.slice(2);
  const filePath = args.find((a) => !a.startsWith('--'));
  const apply = args.includes('--apply');

  if (!filePath) {
    console.error('Thiếu đường dẫn file.\nVí dụ: node --env-file=.env scripts/sync-kiotviet-products.mjs "DanhSachSanPham.xlsx" --apply');
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.error('Không tìm thấy file:', filePath);
    process.exit(1);
  }

  const url = process.env.SUPABASE_PRODUCTS_URL;
  const key = process.env.SUPABASE_PRODUCTS_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Thiếu SUPABASE_PRODUCTS_URL / SUPABASE_SERVICE_ROLE_KEY.\nChạy lại với: node --env-file=.env scripts/sync-kiotviet-products.mjs ...');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null });
  console.log(`Đọc được ${rows.length} dòng từ sheet "${sheetName}" trong file ${filePath}.`);

  const { data: existing, error: exErr } = await supabase
    .from('products')
    .select('id, sku, price_wholesale, price_retail')
    .not('sku', 'is', null)
    .neq('sku', '');
  if (exErr) {
    console.error('Lỗi đọc products hiện có trên Supabase:', exErr.message);
    process.exit(1);
  }
  const existingBySku = new Map(existing.map((p) => [p.sku, p]));
  console.log(`Đang có ${existingBySku.size} mã hàng với sku hợp lệ trong Supabase.`);

  const toInsert = [];
  const toUpdate = [];
  const warnings = [];
  const unmappedGroups = new Set();
  let skippedNoSku = 0;
  let zeroPriceKept = 0;
  let negativeStock = 0;

  for (const row of rows) {
    const sku = row['Mã hàng'] ? String(row['Mã hàng']).trim() : '';
    const name = row['Tên hàng'] ? String(row['Tên hàng']).trim() : '';
    if (!sku || !name) { skippedNoSku++; continue; }

    const kiotGroup = row['Nhóm hàng(3 Cấp)'] ? String(row['Nhóm hàng(3 Cấp)']).trim() : null;
    if (kiotGroup && !CATEGORY_MAP[kiotGroup]) unmappedGroups.add(kiotGroup);
    const category = (kiotGroup && CATEGORY_MAP[kiotGroup]) || kiotGroup || 'Chưa phân loại';

    const unit = normalizeUnit(row['ĐVT']);
    const giaBan = toNumber(row['Giá bán']);
    const giaVon = toNumber(row['Giá vốn']);
    const tonKho = toNumber(row['Tồn kho']);
    const tonNhoNhat = toNumber(row['Tồn nhỏ nhất']);
    let tonLonNhat = Number(row['Tồn lớn nhất']);
    if (!Number.isFinite(tonLonNhat) || tonLonNhat >= 999999999) tonLonNhat = null;
    const active = row['Đang kinh doanh'] === 1 || row['Đang kinh doanh'] === '1';
    const image = firstImageUrl(row['Hình ảnh (url1,url2...)']);

    if (tonKho < 0) {
      negativeStock++;
      if (warnings.length < 20) warnings.push(`Tồn kho âm: ${sku} (${name}) = ${tonKho}`);
    }

    const existingRow = existingBySku.get(sku);

    const patch = {
      sku,
      name,
      category,
      kiotviet_group: kiotGroup,
      unit,
      cost_price: giaVon,
      stock_qty: tonKho,
      min_stock: tonNhoNhat,
      max_stock: tonLonNhat,
      track_inventory: resolveTrackInventory(kiotGroup),
      active,
      data_source: 'kiotviet',
      last_synced_at: new Date().toISOString(),
    };
    if (image) patch.image_url = image;

    if (giaBan > 0) {
      patch.price_wholesale = giaBan;
      patch.price_retail = giaBan;
    } else if (existingRow) {
      zeroPriceKept++;
    }

    if (existingRow) {
      toUpdate.push({ id: existingRow.id, ...patch });
    } else {
      toInsert.push({
        local_product_id: slugifyLocalId(sku),
        price_wholesale: giaBan,
        price_retail: giaBan,
        ...patch,
      });
    }
  }

  console.log('\n--- TÓM TẮT ---');
  console.log('Sẽ thêm mới:', toInsert.length);
  console.log('Sẽ cập nhật:', toUpdate.length);
  console.log('Bỏ qua (thiếu mã hàng hoặc tên hàng):', skippedNoSku);
  console.log('Tồn kho đang âm trên KiotViet (phòng thu mua cần kiểm lại):', negativeStock);
  console.log('Giữ nguyên giá bán cũ vì KiotViet để giá bán = 0:', zeroPriceKept);
  if (unmappedGroups.size) {
    console.log('\nNhóm hàng CHƯA có trong CATEGORY_MAP (đang tạm giữ nguyên tên gốc), nên bổ sung vào script:');
    [...unmappedGroups].forEach((g) => console.log(' -', g));
  }
  if (warnings.length) {
    console.log('\nMột số dòng tồn kho âm (tối đa 20 dòng đầu):');
    warnings.forEach((w) => console.log(' -', w));
  }

  if (!apply) {
    console.log('\n(Đang ở chế độ XEM TRƯỚC — không có gì được ghi vào Supabase. Thêm --apply vào cuối lệnh để ghi thật.)');
    return;
  }

  console.log('\nĐang ghi vào Supabase...');
  const BATCH = 500;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const chunk = toInsert.slice(i, i + BATCH);
    const { error } = await supabase.from('products').insert(chunk);
    if (error) console.error(`Lỗi insert batch bắt đầu dòng ${i}:`, error.message);
  }
  const UPDATE_CONCURRENCY = 15;
  for (let i = 0; i < toUpdate.length; i += UPDATE_CONCURRENCY) {
    const chunk = toUpdate.slice(i, i + UPDATE_CONCURRENCY);
    await Promise.all(
      chunk.map(async (row) => {
        const { id, ...fields } = row;
        const { error } = await supabase.from('products').update(fields).eq('id', id);
        if (error) console.error(`Lỗi update sku=${row.sku}:`, error.message);
      })
    );
  }
  console.log('Hoàn tất đồng bộ.');
}

main().catch((err) => {
  console.error('Lỗi không mong muốn:', err);
  process.exit(1);
});
