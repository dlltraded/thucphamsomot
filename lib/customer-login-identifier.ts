import { getCustomerSupabaseAdmin } from '@/lib/customer-supabase-server';

export async function resolveCustomerIdentifier(identifier: string): Promise<{ status: 'found' | 'missing' | 'ambiguous' | 'invalid'; code?: string }> {
  const db = getCustomerSupabaseAdmin();
  const input = identifier.trim();
  const { data, error } = await db.rpc('tps1_resolve_customer_identifier', { p_identifier: input });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (row?.status === 'missing' && !/^[+0-9 ()-]+$/.test(input)) {
    const legacyCode = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/\s+/g, '').toUpperCase();
    const candidates = [...new Set([legacyCode, legacyCode.startsWith('TPS1-') ? '' : `TPS1-${legacyCode}`])].filter(Boolean);
    for (const candidate of candidates) {
      if (candidate === input) continue;
      const retry = await db.rpc('tps1_resolve_customer_identifier', { p_identifier: candidate });
      if (retry.error) throw retry.error;
      const match = Array.isArray(retry.data) ? retry.data[0] : retry.data;
      if (match?.status === 'found') return { status: 'found', code: match.partner_code };
    }
  }
  return { status: row?.status || 'missing', code: row?.partner_code || undefined };
}
