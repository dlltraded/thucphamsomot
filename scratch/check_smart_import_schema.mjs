import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)$/);
  if (match) env[match[1]] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
}
const supabase = createClient(
  env.SUPABASE_PRODUCTS_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_PRODUCTS_SERVICE_ROLE_KEY,
);

let failed = false;
for (const table of ['order_import_batches', 'order_import_lines', 'product_aliases', 'product_unit_conversions']) {
  const { error } = await supabase.from(table).select('id').limit(1);
  console.log(`${table}: ${error ? `MISSING (${error.code || error.message || 'unknown'})` : 'OK'}`);
  failed ||= Boolean(error);
}
process.exitCode = failed ? 1 : 0;
