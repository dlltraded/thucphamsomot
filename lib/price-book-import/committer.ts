import { SupabaseClient } from '@supabase/supabase-js';
import {
  ImportPreviewStats,
  MappingConfig,
  PriceBookColumnMapping,
  RowValidationResult,
} from './types';

export interface CommitImportOptions {
  fileName: string;
  fileChecksum: string;
  sheetName: string;
  mapping: MappingConfig;
  allRows: RowValidationResult[];
  stats: ImportPreviewStats;
  importedBy?: string;
  validOnly?: boolean; // default true
}

export interface CommitResult {
  jobId: string;
  priceBookIds: string[];
  committedRowsCount: number;
  message: string;
  status: 'draft' | 'pending_approval';
}

export async function commitImportJob(
  supabase: SupabaseClient,
  options: CommitImportOptions
): Promise<CommitResult> {
  const {
    fileName,
    fileChecksum,
    sheetName,
    mapping,
    allRows,
    stats,
    importedBy = 'system_admin',
    validOnly = true,
  } = options;

  // 1. Idempotency Check:
  // Check if a job with the exact same fileChecksum was already committed
  const { data: existingJobs } = await supabase
    .from('price_book_import_jobs')
    .select('id, status, created_at, stats')
    .eq('status', 'completed')
    .limit(10);

  // If already committed with exact checksum in stats or file_checksum
  const duplicate = (existingJobs || []).find((j: any) => {
    return j.stats?.fileChecksum === fileChecksum;
  });

  if (duplicate) {
    throw new Error(
      `File này đã được import và commit thành công trước đó (Job ID: ${duplicate.id}, thời gian: ${duplicate.created_at}). Tránh nhập trùng lặp!`
    );
  }

  // 2. Create the master import job
  const { data: job, error: jobError } = await supabase
    .from('price_book_import_jobs')
    .insert({
      status: 'processing',
      created_by: importedBy,
      stats: {
        fileName,
        fileChecksum,
        sheetName,
        mapping,
        stats,
      },
    })
    .select('id')
    .single();

  if (jobError || !job) {
    throw new Error(`Không thể khởi tạo import job: ${jobError?.message}`);
  }

  const jobId = job.id;
  const createdPbIds: string[] = [];

  try {
    // 3. For each mapped price book, create or retrieve a DRAFT price book
    for (const pbMap of mapping.priceBooks) {
      // Find if an active or draft version exists to bump version
      const { data: existingPbs } = await supabase
        .from('price_books')
        .select('id, code, version, status')
        .eq('code', pbMap.code)
        .order('version', { ascending: false })
        .limit(1);

      const latestPb = existingPbs && existingPbs.length > 0 ? existingPbs[0] : null;
      let newVersion = 1;
      let targetPbId: string;

      if (latestPb) {
        newVersion = latestPb.version + 1;
        // CREATE A NEW VERSION in 'draft' status — NEVER overwrite active!
        const newCode = `${pbMap.code}_v${newVersion}`;
        const { data: createdPb, error: pbErr } = await supabase
          .from('price_books')
          .insert({
            code: newCode,
            name: `${pbMap.name} (v${newVersion})`,
            kind: pbMap.kind,
            status: 'draft', // MUST BE DRAFT
            version: newVersion,
            created_by: importedBy,
          })
          .select('id')
          .single();

        if (pbErr || !createdPb) {
          throw new Error(`Lỗi tạo version mới cho bảng giá ${pbMap.code}: ${pbErr?.message}`);
        }
        targetPbId = createdPb.id;
      } else {
        // First time creating this price book code
        const { data: createdPb, error: pbErr } = await supabase
          .from('price_books')
          .insert({
            code: pbMap.code,
            name: pbMap.name,
            kind: pbMap.kind,
            status: 'draft', // MUST BE DRAFT
            version: 1,
            created_by: importedBy,
          })
          .select('id')
          .single();

        if (pbErr || !createdPb) {
          throw new Error(`Lỗi tạo bảng giá ${pbMap.code}: ${pbErr?.message}`);
        }
        targetPbId = createdPb.id;
      }

      createdPbIds.push(targetPbId);

      // 4. Batch insert items for this price book
      const itemsToInsert: any[] = [];

      for (const row of allRows) {
        if (validOnly && !row.isValid) continue;

        const product = row.matchResult.product;
        if (!product) continue;

        const priceInfo = row.prices[pbMap.key];
        if (!priceInfo || priceInfo.finalPrice == null) continue;
        if (priceInfo.status === 'zero_price' && !mapping.allowZeroPrice) continue;
        if (priceInfo.status === 'invalid_price' || priceInfo.status === 'invalid_format') continue;

        itemsToInsert.push({
          price_book_id: targetPbId,
          product_id: product.id,
          sku_snapshot: product.sku || row.rawSku,
          name_snapshot: product.name || row.rawName,
          unit_snapshot: product.unit || row.rawUnit,
          base_price: priceInfo.sourcePrice,
          price: priceInfo.finalPrice,
          discount_percent: priceInfo.discountPercent || 0,
          discount_amount: priceInfo.discountAmount || 0,
          source_metadata: {
            rowIndex: row.rowIndex,
            rawPrice: priceInfo.sourcePrice,
            importJobId: jobId,
          },
        });
      }

      // Upsert in batches of 500
      const batchSize = 500;
      for (let i = 0; i < itemsToInsert.length; i += batchSize) {
        const batch = itemsToInsert.slice(i, i + batchSize);
        const { error: itemErr } = await supabase.from('price_book_items').upsert(batch, {
          onConflict: 'price_book_id, product_id',
        });
        if (itemErr) {
          throw new Error(`Lỗi lưu dòng giá vào bảng giá ${pbMap.code}: ${itemErr.message}`);
        }
      }

      // 5. If this is a customer-specific pricebook, create a pending customer assignment
      if (pbMap.kind === 'customer' && pbMap.targetCustomerId) {
        await supabase.from('price_book_customer_assignments').insert({
          price_book_id: targetPbId,
          customer_id: pbMap.targetCustomerId,
          priority: 10,
          created_by: importedBy,
        });
      }

      // Record audit log
      await supabase.from('price_book_audit_logs').insert({
        price_book_id: targetPbId,
        action: 'import_commit',
        performed_by: importedBy,
        details: {
          jobId,
          fileName,
          fileChecksum,
          sheetName,
          itemCount: itemsToInsert.length,
          status: 'draft',
        },
      });
    }

    // 6. Save rows audit log in price_book_import_rows (sample first 100 or errors)
    const importRowsToSave = allRows.slice(0, 200).map(r => ({
      job_id: jobId,
      row_index: r.rowIndex,
      raw_data: {
        sku: r.rawSku,
        name: r.rawName,
        unit: r.rawUnit,
      },
      matched_product_id: r.matchResult.product?.id || null,
      validation_status: r.isValid ? 'valid' : 'invalid',
      validation_errors: r.rowErrors.length > 0 ? r.rowErrors : null,
    }));

    if (importRowsToSave.length > 0) {
      await supabase.from('price_book_import_rows').insert(importRowsToSave);
    }

    // 7. Mark job completed
    await supabase
      .from('price_book_import_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    return {
      jobId,
      priceBookIds: createdPbIds,
      committedRowsCount: stats.validRows,
      message: `Đã commit thành công ${createdPbIds.length} bảng giá ở trạng thái DRAFT. Cần phê duyệt để kích hoạt!`,
      status: 'draft',
    };
  } catch (err: any) {
    // Mark job failed
    await supabase
      .from('price_book_import_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        stats: {
          ...options.stats,
          error: err.message,
        },
      })
      .eq('id', jobId);

    throw err;
  }
}
