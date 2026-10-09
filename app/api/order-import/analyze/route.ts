import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { authorizeImportBatch } from '@/lib/order-import/auth';
import { extractOrderLinesWithGemini } from '@/lib/order-import/gemini';
import { extractOrderLinesFromExcel } from '@/lib/order-import/excel';
import { matchExtractedLines } from '@/lib/order-import/matcher';
import type { ExtractedOrderLine, ImportFileDescriptor } from '@/lib/order-import/types';

export const runtime = 'nodejs';
export const maxDuration = 60;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: cors }); }
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }

function signatureMatches(bytes: Buffer, mime: string) {
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (mime === 'image/png') return bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  if (mime === 'image/webp') return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (mime === 'application/pdf') return bytes.subarray(0, 5).toString() === '%PDF-';
  if (mime.includes('spreadsheet') || mime === 'application/vnd.ms-excel') return bytes.subarray(0, 2).toString() === 'PK' || bytes.subarray(0, 8).toString('hex') === 'd0cf11e0a1b11ae1';
  return false;
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'Dữ liệu không hợp lệ' }, 400); }
  const batchId = String(body?.batchId || '');
  const auth = await authorizeImportBatch(req, batchId);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
  if (new Date(auth.batch.expires_at).getTime() < Date.now()) return json({ ok: false, error: 'Phiên nhập đơn đã hết hạn' }, 410);
  if (!['uploading', 'uploaded', 'failed'].includes(auth.batch.status)) return json({ ok: false, error: 'Phiên nhập đơn đang được xử lý hoặc đã hoàn tất' }, 409);

  const files = (Array.isArray(auth.batch.files) ? auth.batch.files : []) as ImportFileDescriptor[];
  const bucket = process.env.ORDER_IMPORT_BUCKET?.trim() || 'order-imports-private';
  await auth.supabase.from('order_import_batches').update({ status: 'analyzing', error_message: null, updated_at: new Date().toISOString() }).eq('id', batchId);
  const extracted: ExtractedOrderLine[] = [];
  const usage: Record<string, number> = {};
  const enrichedFiles: ImportFileDescriptor[] = [];
  try {
    const { data: recentBatches } = await auth.supabase.from('order_import_batches')
      .select('id, files')
      .eq('customer_id', auth.actor.customerId)
      .neq('id', batchId)
      .in('status', ['review', 'confirmed'])
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(30);
    for (const file of files) {
      const { data, error } = await auth.supabase.storage.from(bucket).download(file.path);
      if (error || !data) throw new Error(`Không tải được ${file.name}`);
      const bytes = Buffer.from(await data.arrayBuffer());
      if (bytes.length !== Number(file.size) || !signatureMatches(bytes, file.mimeType)) throw new Error(`${file.name} không đúng định dạng hoặc đã bị thay đổi`);
      if (file.mimeType === 'application/pdf') {
        const pageCount = (bytes.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
        if (pageCount > 20) throw new Error(`${file.name} có ${pageCount} trang, vượt giới hạn 20 trang`);
      }
      const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
      enrichedFiles.push({ ...file, sha256 });
      const cachedSource = (recentBatches || []).flatMap((batch: any) =>
        (Array.isArray(batch.files) ? batch.files : []).map((cachedFile: any) => ({ batchId: batch.id, file: cachedFile })))
        .find((entry: any) => entry.file?.sha256 === sha256);
      if (cachedSource) {
        const { data: cachedLines } = await auth.supabase.from('order_import_lines')
          .select('source_page, source_row, raw_text, raw_sku, raw_name, raw_quantity, raw_unit, raw_note, document_price, extraction_confidence')
          .eq('batch_id', cachedSource.batchId)
          .eq('source_file', cachedSource.file.name);
        extracted.push(...(cachedLines || []).map((line: any) => ({
          sourceFile: file.name, sourcePage: line.source_page, sourceRow: line.source_row,
          rawText: line.raw_text, sku: line.raw_sku, name: line.raw_name,
          quantity: Number(line.raw_quantity), unit: line.raw_unit, note: line.raw_note,
          documentPrice: line.document_price == null ? null : Number(line.document_price),
          confidence: line.extraction_confidence == null ? null : Number(line.extraction_confidence),
        })));
        usage.cacheHitFiles = (usage.cacheHitFiles || 0) + 1;
      } else if (file.mimeType.includes('spreadsheet') || file.mimeType === 'application/vnd.ms-excel') {
        extracted.push(...extractOrderLinesFromExcel(bytes, file.name));
      } else {
        const result = await extractOrderLinesWithGemini({ bytes, mimeType: file.mimeType, fileName: file.name });
        extracted.push(...result.lines);
        for (const [key, value] of Object.entries(result.usage)) if (Number.isFinite(Number(value))) usage[key] = (usage[key] || 0) + Number(value);
      }
      if (extracted.length > 300) throw new Error('Tổng số dòng hàng vượt giới hạn 300 dòng');
    }
    if (!extracted.length) throw new Error('Không đọc được dòng hàng nào trong tệp');
    const promptTokens = Number(usage.promptTokenCount || 0);
    const outputTokens = Number(usage.candidatesTokenCount || 0) + Number(usage.thoughtsTokenCount || 0);
    usage.estimated_cost_usd = Math.round(((promptTokens * 0.30 + outputTokens * 2.50) / 1_000_000) * 1_000_000) / 1_000_000;
    const matched = await matchExtractedLines(auth.supabase, auth.actor.customerId, extracted);
    await auth.supabase.from('order_import_lines').delete().eq('batch_id', batchId);
    const { data: saved, error: saveError } = await auth.supabase.from('order_import_lines')
      .insert(matched.map((line) => ({ ...line, batch_id: batchId }))).select('*');
    if (saveError) throw saveError;
    await auth.supabase.from('order_import_batches').update({
      status: 'review', files: enrichedFiles, line_count: saved?.length || 0, usage_metadata: usage, updated_at: new Date().toISOString(),
    }).eq('id', batchId);
    return json({ ok: true, batch: { ...auth.batch, status: 'review', files: enrichedFiles, line_count: saved?.length || 0, usage_metadata: usage }, lines: saved || [], summary: summarize(saved || []) });
  } catch (error: any) {
    await auth.supabase.from('order_import_batches').update({ status: 'failed', error_message: String(error?.message || error), updated_at: new Date().toISOString() }).eq('id', batchId);
    return json({ ok: false, error: error?.message || 'Không phân tích được tệp' }, 400);
  }
}

function summarize(lines: any[]) {
  return lines.reduce((sum, line) => { sum.total++; sum[line.status] = (sum[line.status] || 0) + 1; return sum; }, { total: 0 } as Record<string, number>);
}
