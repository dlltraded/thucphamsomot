import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import {
  inspectWorkbookBuffer,
  detectSheetMapping,
  ProductMatcher,
  generatePreview,
} from '../lib/price-book-import/index.ts';

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

async function runKvTest() {
  console.log('Testing KiotViet Pricebook Files...');
  const downloadDir = 'C:\\Users\\boanl\\Downloads';
  const kvFiles = [
    'BangGia_KV22092026-164602-820.xlsx',
    'BangGia_KV22092026-213634-533.xlsx'
  ];

  // Load products
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
  const matcher = new ProductMatcher(allProducts);

  for (const f of kvFiles) {
    const fp = path.join(downloadDir, f);
    if (!fs.existsSync(fp)) {
      console.log(`File not found: ${fp}`);
      continue;
    }
    console.log(`\n--- Testing ${f} ---`);
    const buf = fs.readFileSync(fp);
    const inspect = inspectWorkbookBuffer(buf, f);
    console.log('Inspection:', {
      fileName: inspect.fileName,
      size: inspect.fileSize,
      checksum: inspect.checksum.slice(0, 16) + '...',
      type: inspect.detectedType,
    });

    const wb = xlsx.read(buf, { type: 'buffer', dense: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const mapping = detectSheetMapping(sheet, wb.SheetNames[0]);
    console.log('Mapping:', {
      sheetName: mapping.sheetName,
      skuCol: mapping.skuColIndex,
      nameCol: mapping.nameColIndex,
      unitCol: mapping.unitColIndex,
      priceBooks: mapping.priceBooks.map(p => ({ name: p.name, code: p.code, col: p.priceColIndex })),
    });

    const preview = generatePreview(sheet, mapping, matcher, 1, 50);
    console.log('Preview Stats:', preview.stats);
    if (preview.stats.validRows > 0 || preview.stats.totalRows > 1000) {
      console.log(`-> ĐẠT: ${f} được nhận diện và xử lý thành công!`);
    }
  }
}

runKvTest().catch(console.error);
