const crypto = require('crypto');
const https = require('https');

const secretKey = 'f41214d4237be21bf7d6c7c88f4a546d';

const payload = JSON.stringify({
  amount: 10000,
  desc: 'Thanh toán đơn hàng DH123456',
  extradata: '',
  item: '[]',
  method: '{"id":"COD","isCustom":false}'
});

const req = https.request({
  hostname: 'thucphamsomot.vn',
  path: '/api/payment/create-order-mac',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const data = JSON.parse(body);
    const liveMac = data.mac;
    
    const macDataObj = {
      amount: 10000,
      desc: 'Thanh toán đơn hàng DH123456',
      extradata: '',
      item: '[]',
      method: '{"id":"COD","isCustom":false}'
    };
    const sortedKeys = Object.keys(macDataObj).sort();
    const macDataString = sortedKeys.map(key => `${key}=${macDataObj[key]}`).join('&');
    const localMac = crypto.createHmac('sha256', secretKey).update(macDataString).digest('hex');
    
    console.log('Live MAC:', liveMac);
    console.log('Local MAC:', localMac);
    console.log('Matches?', liveMac === localMac);
  });
});
req.on('error', e => console.error(e));
req.write(payload);
req.end();
