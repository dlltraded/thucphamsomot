import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { extractOrderLinesWithGemini } from '../lib/order-import/gemini';
import { matchExtractedLines } from '../lib/order-import/matcher';

const imagePath = process.argv[2];
if (!imagePath || !fs.existsSync(imagePath)) throw new Error('Truyền đường dẫn ảnh cần kiểm thử');
const envText = fs.readFileSync('.env.local', 'utf8');
const dbEnvText = fs.readFileSync('.env', 'utf8');
const key = envText.match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
if (!key) throw new Error('Chưa có GEMINI_API_KEY trong .env.local');
process.env.GEMINI_API_KEY = key;
process.env.GEMINI_ORDER_MODEL ||= 'gemini-2.5-flash';

const result = await extractOrderLinesWithGemini({
  bytes: fs.readFileSync(imagePath),
  mimeType: 'image/png',
  fileName: path.basename(imagePath),
});
const env = Object.fromEntries(dbEnvText.split(/\r?\n/).map((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)$/);
  return match ? [match[1], match[2].trim().replace(/^['"](.*)['"]$/, '$1')] : [];
}).filter((entry) => entry.length === 2));
const customerId = process.argv[3];
let matched = null;
if (customerId) {
  const supabase = createClient(env.SUPABASE_PRODUCTS_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_PRODUCTS_SERVICE_ROLE_KEY);
  matched = await matchExtractedLines(supabase, customerId, result.lines);
}
console.log(JSON.stringify({ lineCount: result.lines.length, lines: result.lines, matched, usage: result.usage }, null, 2));
