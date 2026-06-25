const { createClient } = require('@supabase/supabase-js');
const config = require('./tps1-miniapp/zmp-cli.json');
const s = createClient(config.env.production.VITE_SUPABASE_URL, config.env.production.VITE_SUPABASE_ANON_KEY);
s.from('products').select('*').limit(2).then(r => console.log(r.data));
