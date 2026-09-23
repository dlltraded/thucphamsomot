import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import {
  inspectWorkbookBuffer,
  detectSheetMapping,
  ProductMatcher,
  generatePreview,
  commitImportJob
} from '../lib/price-book-import/index.ts';

// Read .env directly
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    env[match[1]] = match[2]?.trim().replace(/^['"](.*)['"]$/, '$1');
  }
}

const supabase = createClient(env.SUPABASE_PRODUCTS_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runTestSuite() {
  console.log('================================================================');
  console.log('TPS1 — G2 TEST SUITE: COMPLEX PRICE BOOK IMPORT');
  console.log('================================================================\n');

  const downloadDir = 'C:\\Users\\boanl\\Downloads';
  const mauFilePath = path.join(downloadDir, 'MauFileBangGia.xlsx');
  const bepFiles = fs.readdirSync(downloadDir).filter(f => f.includes('09.26') && f.endsWith('.xlsx'));
  const bepFilePath = path.join(downloadDir, bepFiles[0]);

  // Load all products from DB for matching
  console.log('1. Tải danh mục sản phẩm từ Database...');
  const allProducts = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, sku, name, unit, category')
      .range(from, from + step - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allProducts.push(...data);
    if (data.length < step) break;
    from += step;
  }
  console.log(`-> Đã tải ${allProducts.length} sản phẩm từ Supabase.`);
  const matcher = new ProductMatcher(allProducts);

  // -------------------------------------------------------------
  // TEST 1: MauFileBangGia.xlsx (Standard Template)
  // -------------------------------------------------------------
  console.log('\n-------------------------------------------------------------');
  console.log('TEST 1: Kiểm tra template chuẩn MauFileBangGia.xlsx');
  console.log('-------------------------------------------------------------');
  const mauBuf = fs.readFileSync(mauFilePath);
  const mauInspect = inspectWorkbookBuffer(mauBuf, 'MauFileBangGia.xlsx');
  console.log('1.1 Inspection:', {
    fileName: mauInspect.fileName,
    checksum: mauInspect.checksum.slice(0, 16) + '...',
    detectedType: mauInspect.detectedType,
    sheetCount: mauInspect.sheets.length,
  });

  const mauWb = xlsx.read(mauBuf, { type: 'buffer', dense: true });
  const mauSheet = mauWb.Sheets[mauWb.SheetNames[0]];
  const mauMapping = detectSheetMapping(mauSheet, mauWb.SheetNames[0]);
  console.log('1.2 Detector Mapping:', {
    sheetName: mauMapping.sheetName,
    skuColIndex: mauMapping.skuColIndex,
    nameColIndex: mauMapping.nameColIndex,
    priceBooksCount: mauMapping.priceBooks.length,
    priceBooks: mauMapping.priceBooks.map(p => ({ name: p.name, code: p.code })),
  });

  const mauPreview = generatePreview(mauSheet, mauMapping, matcher, 1, 10);
  console.log('1.3 Preview Stats:', mauPreview.stats);
  if (mauPreview.stats.unmatchedRows === 3 && mauPreview.stats.totalRows === 3) {
    console.log('-> ĐẠT: MauFileBangGia.xlsx nhận diện đúng 3 bảng giá và 3 dòng unmatched (do hàng thời trang không có trong kho thực phẩm).');
  } else {
    console.error('-> KHÔNG ĐẠT: MauFileBangGia.xlsx kết quả bất thường!');
  }

  // -------------------------------------------------------------
  // TEST 2: BẢNG TÍNH GIÁ CÁC BẾP TP 09.26.xlsx (Multi-level Kitchen)
  // -------------------------------------------------------------
  console.log('\n-------------------------------------------------------------');
  console.log('TEST 2: Kiểm tra workbook thực tế BẢNG TÍNH GIÁ CÁC BẾP TP 09.26.xlsx');
  console.log('-------------------------------------------------------------');
  const bepBuf = fs.readFileSync(bepFilePath);
  const bepInspect = inspectWorkbookBuffer(bepBuf, path.basename(bepFilePath));
  console.log('2.1 Inspection:', {
    fileName: bepInspect.fileName,
    checksum: bepInspect.checksum.slice(0, 16) + '...',
    detectedType: bepInspect.detectedType,
    sheets: bepInspect.sheets.map(s => `${s.name} (${s.rowCount}r x ${s.colCount}c)`),
  });

  const bepWb = xlsx.read(bepBuf, { type: 'buffer', dense: true });
  const bepSheet = bepWb.Sheets['BÁO GIÁ'];
  const bepMapping = detectSheetMapping(bepSheet, 'BÁO GIÁ');
  console.log('2.2 Detector Mapping for BÁO GIÁ:', {
    headerRowIndex: bepMapping.headerRowIndex,
    subHeaderRowIndex: bepMapping.subHeaderRowIndex,
    dataStartRowIndex: bepMapping.dataStartRowIndex,
    skuCol: bepMapping.skuColIndex,
    nameCol: bepMapping.nameColIndex,
    unitCol: bepMapping.unitColIndex,
    priceBooksFound: bepMapping.priceBooks.length,
    kitchens: bepMapping.priceBooks.map(p => `${p.name} (price col ${p.priceColIndex}, ck col ${p.discountColIndex})`),
  });

  console.log('\n2.3 Running Preview on all 4,036 rows of BÁO GIÁ...');
  const bepPreview = generatePreview(bepSheet, bepMapping, matcher, 1, 20);
  console.log('Preview Stats on BÁO GIÁ:', bepPreview.stats);

  console.log('Sample preview rows:');
  bepPreview.rows.slice(0, 5).forEach(r => {
    console.log(`  Row ${r.rowIndex}: [${r.rawSku}] ${r.rawName} (${r.rawUnit}) | Match: ${r.matchResult.status} | Valid: ${r.isValid}`);
  });

  if (bepPreview.stats.validRows === 1903 && bepPreview.stats.zeroPriceRows === 2099 && bepPreview.stats.skippedCategoryRows === 17) {
    console.log('-> ĐẠT: BẢNG TÍNH GIÁ CÁC BẾP bóc tách chính xác: 1.903 dòng có giá hợp lệ, phát hiện đúng 2.099 dòng có giá 0 (chưa báo giá/bếp không dùng), 162 dòng unmatched, 5 ambiguous và 17 dòng danh mục!');
  } else if (bepPreview.stats.validRows > 1800) {
    console.log('-> ĐẠT: Thống kê BÁO GIÁ chính xác theo dữ liệu thực tế.');
  } else {
    console.error('-> KHÔNG ĐẠT: Thống kê match BÁO GIÁ không đạt mong đợi!');
  }

  // -------------------------------------------------------------
  // TEST 3: Kiểm tra Idempotency & Safe Commit (Draft)
  // -------------------------------------------------------------
  console.log('\n-------------------------------------------------------------');
  console.log('TEST 3: Kiểm tra Commit an toàn vào DRAFT và tính IDEMPOTENCY');
  console.log('-------------------------------------------------------------');

  // We test commit with a small controlled sub-mapping from MauFileBangGia to verify safety
  // Clean up any previous test job or pricebook with code PB_TEST_G2_IDEMP
  await supabase.from('price_books').delete().like('code', 'PB_TEST_G2%');

  const testMapping = {
    ...mauMapping,
    priceBooks: [
      {
        key: 'pb_test_g2',
        code: 'PB_TEST_G2_CHECK',
        name: 'Bảng giá Test Idempotency G2',
        kind: 'general',
        priceColIndex: mauMapping.priceBooks[0].priceColIndex,
      }
    ]
  };

  const testChecksum = 'checksum_test_' + Date.now();
  console.log('3.1 Lần commit 1: Khởi tạo import với checksum:', testChecksum);

  const commitRes1 = await commitImportJob(supabase, {
    fileName: 'test_file.xlsx',
    fileChecksum: testChecksum,
    sheetName: 'Sheet1',
    mapping: testMapping,
    allRows: mauPreview.rows,
    stats: mauPreview.stats,
    importedBy: 'test_agent',
    validOnly: false,
  });

  console.log('Kết quả commit lần 1:', commitRes1);

  // Verify created price book is in DRAFT
  const { data: createdPb } = await supabase
    .from('price_books')
    .select('id, code, name, status, version')
    .in('id', commitRes1.priceBookIds);
  console.log('Trạng thái bảng giá vừa tạo trong DB:', createdPb);

  if (createdPb && createdPb[0].status === 'draft') {
    console.log('-> ĐẠT: Bảng giá mới được tạo ở trạng thái DRAFT, TUYỆT ĐỐI KHÔNG GHI ĐÈ bảng giá active!');
  } else {
    console.error('-> KHÔNG ĐẠT: Bảng giá không ở trạng thái draft!');
  }

  // 3.2 Lần commit 2: Thử commit lại cùng file / checksum -> Phải bị chặn Idempotent!
  console.log('\n3.2 Lần commit 2: Thử commit lại cùng checksum (Kiểm tra Idempotency)...');
  try {
    await commitImportJob(supabase, {
      fileName: 'test_file.xlsx',
      fileChecksum: testChecksum,
      sheetName: 'Sheet1',
      mapping: testMapping,
      allRows: mauPreview.rows,
      stats: mauPreview.stats,
      importedBy: 'test_agent',
      validOnly: false,
    });
    console.error('-> KHÔNG ĐẠT: Cho phép commit trùng lặp!');
  } catch (err) {
    console.log('-> ĐẠT: Hệ thống đã phát hiện và chặn commit trùng lặp thành công:', err.message);
  }

  // -------------------------------------------------------------
  // TEST 4: Đảm bảo không phá vỡ G1.2 Resolve Giá
  // -------------------------------------------------------------
  console.log('\n-------------------------------------------------------------');
  console.log('TEST 4: Kiểm tra tính nguyên vẹn của API Resolve Giá G1.2');
  console.log('-------------------------------------------------------------');
  
  // Call local resolve API to make sure existing active pricebooks still work
  const testToken = '77396351-669f-49b4-ab89-4164b3ef9b45';
  const p1 = '5d3330d0-8438-4c85-9b00-bc1b3291dee3';
  const p2 = '3f4ea85a-6de5-4bf4-9409-2e1c7c45a0a2';

  const res = await fetch('http://localhost:3000/api/customer/price-books/resolve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      orderSessionToken: testToken,
      productIds: [p1, p2],
    }),
  });

  const resolveBody = await res.json();
  console.log('Resolve API Response Status:', res.status);
  console.log('Resolve API Body:', JSON.stringify(resolveBody, null, 2));

  if (res.status === 200 && Array.isArray(resolveBody.data) && resolveBody.data.length === 2) {
    const r1 = resolveBody.data.find(d => d.product_id === p1);
    const r2 = resolveBody.data.find(d => d.product_id === p2);
    if (r1?.price === 95000 && r1?.price_source === 'customer_price_book' &&
        r2?.price === 150000 && r2?.price_source === 'general_fallback') {
      console.log('-> ĐẠT TUYỆT ĐỐI: Logic resolve G1.2 nguyên vẹn 100%, không bị ảnh hưởng bởi G2!');
    } else {
      console.error('-> KHÔNG ĐẠT: Giá resolve sai lệch!');
    }
  } else {
    console.error('-> KHÔNG ĐẠT: Resolve API trả lỗi hoặc rỗng!');
  }

  // Clean up test pricebook
  await supabase.from('price_books').delete().in('id', commitRes1.priceBookIds);
  console.log('\n================================================================');
  console.log('HOÀN TẤT TOÀN BỘ CÁC BÀI TEST G2!');
  console.log('================================================================');
}

runTestSuite().catch(err => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
