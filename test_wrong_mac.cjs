const https = require('https');
const payload = JSON.stringify({ amount: 10000, desc: 'test', extradata: '', item: [], method: {id:'COD',isCustom:false}, mac: 'wrongmac' });
const req = https.request({ hostname: 'payment-mini.zalo.me', path: '/api/order/create-v2', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }, res => {
  let b=''; res.on('data', d => b+=d); res.on('end', () => console.log('Response:', b));
});
req.write(payload);
req.end();
