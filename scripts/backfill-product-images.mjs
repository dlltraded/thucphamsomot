#!/usr/bin/env node
/**
 * scripts/backfill-product-images.mjs
 *
 * Chuyển ảnh sản phẩm từ KiotViet CDN về Supabase Storage:
 *   - Tạo thumbnail 200x200 webp (thumbs/{id}.webp)
 *   - Tạo ảnh vừa 800px webp (img/{id}.webp)
 *   - Lưu vào Supabase Storage bucket "products" (hoặc "product-images")
 *   - Cập nhật products.thumb_url, products.image_url, giữ URL gốc ở image_url_original
 *   - Chuỗi rỗng / null -> chuẩn hóa về null
 *   - Idempotent: bỏ qua các ảnh đã chuyển đổi trước đó
 *
 * Mặc định: CHẾ ĐỘ XEM TRƯỚC (DRY-RUN) — KHÔNG GHI GÌ VÀO STORAGE HOẶC DATABASE.
 *
 * Cách dùng:
 *   node --env-file=.env scripts/backfill-product-images.mjs
 *   node --env-file=.env scripts/backfill-product-images.mjs --limit=10
 *   node --env-file=.env scripts/backfill-product-images.mjs --apply (chỉ admin chạy, có hỏi YES)
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const maxLimit = limitArg ? Math.max(1, parseInt(limitArg.split('=')[1], 10)) : 0;
  const batchArg = args.find((a) => a.startsWith('--batch='));
  const batchSize = batchArg ? Math.max(1, parseInt(batchArg.split('=')[1], 10)) : 50;
  const concArg = args.find((a) => a.startsWith('--concurrency='));
  const CONCURRENCY = concArg ? Math.max(1, Math.min(16, parseInt(concArg.split('=')[1], 10))) : 8;

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  console.log('='.repeat(70));
  console.log('TPS1 — CHUYỂN ẢNH SẢN PHẨM VỀ SUPABASE STORAGE (WP4)');
  console.log(`Chế độ: ${apply ? 'GHI THẬT (--apply)' : 'XEM TRƯỚC (DRY-RUN)'}`);
  console.log(`Kích thước lô xử lý: ${batchSize} sản phẩm/lô`);
  if (maxLimit > 0) console.log(`Giới hạn tối đa: ${maxLimit} sản phẩm`);
  console.log('='.repeat(70));

  const url = process.env.SUPABASE_PRODUCTS_URL;
  const key =
    process.env.SUPABASE_PRODUCTS_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('❌ Thiếu SUPABASE_PRODUCTS_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env');
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Kiểm tra Storage bucket
  console.log('Đang kiểm tra cấu hình Supabase Storage...');
  const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
  if (bucketErr) {
    console.error('❌ Lỗi kiểm tra Storage bucket:', bucketErr.message);
    process.exit(1);
  }

  // Luôn dùng bucket 'product-images' ĐÃ CÓ (public, cùng bucket với upload-image/route.ts) — không tạo/đổi bucket.
  const targetBucket = buckets?.find((b) => b.name === 'product-images');
  if (!targetBucket) {
    console.error('❌ Không thấy bucket "product-images" trên Supabase Storage — dừng.');
    process.exit(1);
  }
  const bucketName = targetBucket.name;
  console.log(`✓ Bucket lưu trữ ảnh: "${bucketName}" (public: ${targetBucket?.public ? 'Có' : 'Chưa bật'})`);

  // 2. Tải toàn bộ danh sách sản phẩm active từ bảng products
  console.log('Đang tải danh sách sản phẩm từ Supabase...');
  const allProducts = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;
  let hasThumbColumn = true;

  while (hasMore) {
    const selectCols = hasThumbColumn
      ? 'id, sku, name, category, image_url, thumb_url, image_url_original, active'
      : 'id, sku, name, category, image_url, active';

    let { data: chunk, error: fetchErr } = await supabase
      .from('products')
      .select(selectCols)
      .eq('active', true)
      .order('name', { ascending: true })
      .range(from, from + pageSize - 1);

    if (fetchErr && fetchErr.message.includes('thumb_url')) {
      hasThumbColumn = false;
      console.log('ℹ️ Cột thumb_url chưa có trên Supabase (chưa chạy migration). Đang tải danh sách cơ bản...');
      const fallbackRes = await supabase
        .from('products')
        .select('id, sku, name, category, image_url, active')
        .eq('active', true)
        .order('name', { ascending: true })
        .range(from, from + pageSize - 1);
      chunk = fallbackRes.data;
      fetchErr = fallbackRes.error;
    }

    if (fetchErr) {
      console.error('❌ Lỗi tải danh sách sản phẩm:', fetchErr.message);
      process.exit(1);
    }

    if (chunk && chunk.length > 0) {
      allProducts.push(...chunk);
      from += chunk.length;
      if (chunk.length < pageSize) hasMore = false;
    } else {
      hasMore = false;
    }
  }

  if (!hasThumbColumn && apply) {
    console.error('\n❌ BẮT BUỘC DỪNG LẠI:');
    console.error('Cột "thumb_url" chưa tồn tại trong bảng products trên Supabase!');
    console.error('Anh cần chạy migration "20260920b_product_search.sql" trên Supabase SQL Editor TRƯỚC khi chạy với cờ --apply.\n');
    process.exit(1);
  }

  console.log(`✓ Đã tải ${allProducts.length} sản phẩm đang hoạt động.`);

  // 3. Phân loại sản phẩm
  const noImageProducts = [];
  const alreadyMigratedProducts = [];
  const pendingMigrationProducts = [];

  for (const p of allProducts) {
    const rawImg = (p.image_url || '').trim();
    const rawThumb = (p.thumb_url || '').trim();

    if (!rawImg) {
      noImageProducts.push(p);
      continue;
    }

    // Kiểm tra xem ảnh đã được chuyển về Supabase Storage chưa
    const isSupabaseImage =
      rawImg.includes('/storage/v1/object/public/') ||
      rawImg.includes(`/${bucketName}/`) ||
      (rawThumb && (rawThumb.includes('/storage/v1/object/public/') || rawThumb.includes(`/${bucketName}/`)));

    if (isSupabaseImage) {
      alreadyMigratedProducts.push(p);
    } else {
      pendingMigrationProducts.push(p);
    }
  }

  console.log('\n' + '-'.repeat(70));
  console.log('TỔNG QUAN TÌNH TRẠNG ẢNH SẢN PHẨM:');
  console.log(`  - Tổng sản phẩm active:              ${allProducts.length}`);
  console.log(`  - Đã có ảnh trên Supabase Storage:  ${alreadyMigratedProducts.length}`);
  console.log(`  - Cần chuyển đổi từ CDN KiotViet:   ${pendingMigrationProducts.length}`);
  console.log(`  - Không có ảnh (null hoặc rỗng):     ${noImageProducts.length}`);
  console.log('-'.repeat(70) + '\n');

  let targetList = pendingMigrationProducts;
  if (maxLimit > 0) {
    targetList = targetList.slice(0, maxLimit);
    console.log(`ℹ️ Đang giới hạn xử lý ${targetList.length} sản phẩm theo tham số --limit=${maxLimit}.`);
  }

  // 4. Nếu là DRY-RUN: Thử kết nối kiểm tra 3 ảnh mẫu và dừng
  if (!apply) {
    console.log('[DRY-RUN] Đang thử kiểm tra kết nối CDN cho 3 ảnh mẫu đầu tiên...');
    const sample = targetList.slice(0, 3);
    for (const p of sample) {
      try {
        const start = Date.now();
        const res = await fetch(p.image_url, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
        const ms = Date.now() - start;
        const size = res.headers.get('content-length')
          ? `${Math.round(parseInt(res.headers.get('content-length'), 10) / 1024)} KB`
          : 'không rõ';
        console.log(`  ✓ [HTTP ${res.status}] ${p.name} (${ms}ms, kích thước: ${size})`);
      } catch (err) {
        console.warn(`  ⚠️ Thử tải thất bại: ${p.name} (${err.message})`);
      }
    }

    console.log('\n[DRY-RUN HOÀN TẤT] Không có dữ liệu hay storage nào bị thay đổi.');
    console.log(`Để thực hiện chuyển đổi ảnh thật vào Supabase, hãy chạy với cờ --apply:`);
    console.log(`  node --env-file=.env scripts/backfill-product-images.mjs --apply\n`);
    process.exit(0);
  }

  // 5. Nếu là GHI THẬT (--apply): Hỏi xác nhận bằng bàn phím
  console.log('!'.repeat(70));
  console.log('⚠️ BẠN ĐANG CHẠY CHẾ ĐỘ GHI THẬT (--apply) VÀO SUPABASE STORAGE!');
  console.log(`Sẽ tải và tối ưu hóa ${targetList.length} ảnh sang định dạng WebP.`);
  console.log('!'.repeat(70) + '\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Gõ YES để xác nhận tải và chuyển đổi ảnh vào Supabase Storage: ');
  rl.close();

  if (answer.trim() !== 'YES') {
    console.log('Đã hủy thao tác theo yêu cầu.');
    process.exit(0);
  }

  // 6. Thực thi tải, nén và upload theo từng lô
  const tmpDir = path.resolve(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const errorsList = [];
  let successCount = 0;
  const totalBatches = Math.ceil(targetList.length / batchSize);

  console.log(`\nBắt đầu chuyển đổi ${targetList.length} sản phẩm trong ${totalBatches} lô...\n`);

  for (let b = 0; b < totalBatches; b++) {
    const batch = targetList.slice(b * batchSize, (b + 1) * batchSize);
    console.log(`[Lô ${b + 1}/${totalBatches}] Đang xử lý ${batch.length} sản phẩm (${b * batchSize + 1} - ${b * batchSize + batch.length})...`);

    const processOne = async (p) => {
      try {
        // Tải ảnh gốc từ CDN với timeout 15s
        const res = await fetch(p.image_url, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const rawBuffer = Buffer.from(await res.arrayBuffer());
        if (rawBuffer.length === 0) {
          throw new Error('Dữ liệu ảnh rỗng (0 bytes)');
        }

        // Tạo Thumbnail 200x200 WebP
        const thumbBuffer = await sharp(rawBuffer)
          .resize(200, 200, { fit: 'cover', position: 'center' })
          .webp({ quality: 80 })
          .toBuffer();

        // Tạo Ảnh vừa 800px WebP (giữ tỷ lệ, không phóng to ảnh nhỏ)
        const mediumBuffer = await sharp(rawBuffer)
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();

        const thumbPath = `thumbs/${p.id}.webp`;
        const mediumPath = `img/${p.id}.webp`;

        // Upload lên Supabase Storage
        const { error: thumbUpErr } = await supabase.storage
          .from(bucketName)
          .upload(thumbPath, thumbBuffer, { contentType: 'image/webp', upsert: true });
        if (thumbUpErr) throw new Error(`Upload thumb lỗi: ${thumbUpErr.message}`);

        const { error: medUpErr } = await supabase.storage
          .from(bucketName)
          .upload(mediumPath, mediumBuffer, { contentType: 'image/webp', upsert: true });
        if (medUpErr) throw new Error(`Upload ảnh vừa lỗi: ${medUpErr.message}`);

        // Lấy public URL
        const thumbUrl = supabase.storage.from(bucketName).getPublicUrl(thumbPath).data.publicUrl;
        const mediumUrl = supabase.storage.from(bucketName).getPublicUrl(mediumPath).data.publicUrl;

        // Cập nhật database
        const { error: dbErr } = await supabase
          .from('products')
          .update({
            thumb_url: thumbUrl,
            image_url: mediumUrl,
            image_url_original: p.image_url_original || p.image_url,
          })
          .eq('id', p.id);

        if (dbErr) throw new Error(`Cập nhật DB lỗi: ${dbErr.message}`);

        successCount++;
      } catch (itemErr) {
        console.warn(`  ⚠️ Lỗi xử lý sản phẩm "${p.name}" (${p.sku}): ${itemErr.message}`);
        errorsList.push({
          productId: p.id,
          sku: p.sku,
          name: p.name,
          imageUrl: p.image_url,
          error: itemErr.message,
          at: new Date().toISOString(),
        });
      }
    };

    // Chạy song song tối đa CONCURRENCY ảnh cùng lúc (mặc định 8) để rút ngắn thời gian
    let cursor = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, batch.length) }, async () => {
      while (cursor < batch.length) {
        const p = batch[cursor++];
        await processOne(p);
      }
    });
    await Promise.all(workers);
  }

  // 7. Dọn dẹp chuỗi rỗng: các sản phẩm có image_url là chuỗi rỗng thì chuyển về null
  const emptyStrProducts = noImageProducts.filter((p) => typeof p.image_url === 'string' && p.image_url !== '');
  if (emptyStrProducts.length > 0) {
    console.log(`Đang dọn dẹp ${emptyStrProducts.length} sản phẩm có image_url là chuỗi rỗng sang null...`);
    const emptyIds = emptyStrProducts.map((p) => p.id);
    await supabase.from('products').update({ image_url: null, thumb_url: null }).in('id', emptyIds);
  }

  console.log('\n' + '='.repeat(70));
  console.log(`✓ HOÀN TẤT: Thành công ${successCount}/${targetList.length} ảnh. Lỗi: ${errorsList.length}`);
  console.log('='.repeat(70));

  if (errorsList.length > 0) {
    const errorFilePath = path.join(tmpDir, `image_errors_${dateStr}.json`);
    fs.writeFileSync(errorFilePath, JSON.stringify(errorsList, null, 2), 'utf8');
    console.log(`⚠️ Danh sách ${errorsList.length} ảnh lỗi đã được ghi vào: ${errorFilePath}`);
  }
}

main().catch((err) => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
