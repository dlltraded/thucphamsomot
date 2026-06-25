import fs from 'fs';

const url = 'https://yntgxollwjemyidizhnn.supabase.co/rest/v1/products?select=id,name,price_wholesale,price_retail&limit=5';
const key = 'sb_publishable_BhQX_aNaD5wzocEp7MXD_Q_DA4kOAZn';

fetch(url, {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
}).then(res => res.json()).then(data => console.log(JSON.stringify(data, null, 2))).catch(err => console.error(err));
