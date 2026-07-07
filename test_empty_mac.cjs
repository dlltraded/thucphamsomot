const crypto = require('crypto');
const macDataObj = {amount:10000, desc:'Thanh toán đơn hàng DH123456', extradata:'', item:'[]', method:'{"id":"COD","isCustom":false}'};
const macDataString = Object.keys(macDataObj).sort().map(k=>k+'='+macDataObj[k]).join('&');
const mac = crypto.createHmac('sha256', '').update(macDataString).digest('hex');
console.log('Empty Key MAC:', mac);
