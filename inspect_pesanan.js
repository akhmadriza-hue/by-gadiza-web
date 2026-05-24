const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync(path.resolve('.env.local'), 'utf8').split(/\r?\n/).reduce((acc, line) => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) acc[m[1]] = m[2];
  return acc;
}, {});
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Missing env vars');
const supabase = createClient(url, key, { auth: { persistSession: false } });
const candidates = [
  'detail_produk',
  'detail_produk_json',
  'detail_produk_jsonb',
  'detail_produk_baru',
  'order_items',
  'order_details',
  'items',
  'items_json',
  'cart_items',
  'detail',
  'produk_detail',
  'product_details',
  'details',
  'pesanan_detail',
  'detail_pesanan',
  'item_details'
];
(async () => {
  console.log('Starting candidate column probes for table pesanan...');
  for (const col of candidates) {
    const { data, error } = await supabase.from('pesanan').select(col).limit(1);
    console.log('COLUMN', col, 'ERROR', error ? error.message : null, 'DATA', data);
  }
})();