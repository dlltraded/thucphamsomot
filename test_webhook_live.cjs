const crypto = require('crypto');
const https = require('https');

const secretKey = process.env.ZALO_MINI_APP_PRIVATE_KEY || 'f41214d4237be21bf7d6c7c88f4a546d';

const data = `appId=3506828551978252271&orderId=123456789&method=COD`;
const mac = crypto.createHmac('sha256', secretKey).update(data).digest('hex');

const payload = JSON.stringify({
  data,
  mac
});

const req = https.request({
  hostname: 'thucphamsomot.vn',
  path: '/api/payment/notify',
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
