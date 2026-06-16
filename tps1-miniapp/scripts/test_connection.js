import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yntgxollwjemyidizhnn.supabase.co',
  'sb_publishable_BhQX_aNaD5wzocEp7MXD_Q_DA4kOAZn'
);

async function inspect() {
  const { data } = await supabase.from('products').select('category').eq('active', true);
  const cats = [...new Set(data.map(p => p.category))].sort();
  console.log('All categories (' + cats.length + '):');
  cats.forEach(c => console.log(' -', c));
}

inspect();
