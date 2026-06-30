const https = require('https');
const options = {
  hostname: 'thucphamsomot.vn',
  path: '/api/payment/create-order-mac',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};
const req = https.request(options, (res) => {
  console.log('STATUS:', res.statusCode);
  res.on('data', (d) => process.stdout.write(d));
});
req.on('error', (e) => {
  console.error(e);
});
req.write('{}');
req.end();
