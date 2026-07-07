const crypto = require('crypto');
const https = require('https');

const secretKey = 'f41214d4237be21bf7d6c7c88f4a546d';

const dataObj = {
  amount: 10000,
  desc: 'Thanh toán đơn hàng DH123456',
  extradata: '',
  item: '[]',
  method: '{"id":"COD","isCustom":false}'
};

const sortedKeys = Object.keys(dataObj).sort();
const macDataString = sortedKeys.map(key => `${key}=${dataObj[key]}`).join('&');
const mac = crypto.createHmac('sha256', secretKey).update(macDataString).digest('hex');

const payload = JSON.stringify({
  amount: 10000,
  desc: 'Thanh toán đơn hàng DH123456',
  extradata: '',
  item: [],
  method: {"id":"COD","isCustom":false},
  mac
});

const req = https.request({
  hostname: 'payment-mini.zalo.me',
  path: '/api/order/create-v2',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});
req.on('error', e => console.error(e));
req.write(payload);
req.end();
