import fs from 'fs';

const url = 'https://yntgxollwjemyidizhnn.supabase.co/rest/v1/quotes?select=*';
const key = 'sb_publishable_BhQX_aNaD5wzocEp7MXD_Q_DA4kOAZn';

fetch(url, {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
})
.then(r => r.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
