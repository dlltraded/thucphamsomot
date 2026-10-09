import assert from 'node:assert/strict';
import { rankProductCandidates } from '../lib/order-import/product-match';

const base = { id: '', sku: '', unit: 'Kg', active: true, min_order_qty: 1, order_step: 1, enforce_order_step: false, packaging_note: null, quantity_precision: 3 };
const products = [
  { ...base, id: 'susu', sku: 'r-susu', name: 'Su su' },
  { ...base, id: 'susu2', sku: 'r-susu-2', name: 'Su su' },
  { ...base, id: 'dotsusu', sku: 'r-dotsusu', name: 'Đọt su su' },
  { ...base, id: 'muongsu', sku: 'cc-muongsu', name: 'Muỗng sứ' },
  { ...base, id: 'botsutu', sku: 'k-botsutu', name: 'Bột sư tử' },
  { ...base, id: 'ca-chua-don', sku: 'r-cachuadon', name: 'Cà chua dồn' },
  { ...base, id: 'ca-chem', sku: 'qh-cachem', name: 'Cá chém' },
  { ...base, id: 'choi-lua', sku: 'cc-choilua', name: 'Chổi lúa cán nhựa' },
  { ...base, id: 'ca-rot', sku: 'r-carot', name: 'Cà rốt trắng củ' },
  { ...base, id: 'hanhla', sku: 'r-hanhla', name: 'Hành lá (Kg)' },
  { ...base, id: 'hanhbaro', sku: 'r-hanhbaro', name: 'Hành baro' },
];

assert.equal(rankProductCandidates(products, 'susu')[0]?.product.id, 'susu');
assert.equal(rankProductCandidates(products, 'su su')[0]?.product.id, 'susu');
assert.equal(rankProductCandidates(products, 'Hành lá')[0]?.product.id, 'hanhla');
assert.deepEqual(rankProductCandidates(products, 'su su').map((entry) => entry.product.id), ['susu', 'susu2', 'dotsusu']);
assert.ok(!rankProductCandidates(products, 'su su').some((entry) => ['muongsu', 'botsutu'].includes(entry.product.id)));
assert.ok(rankProductCandidates(products, 'cà chua nhỏ').some((entry) => entry.product.id === 'ca-chua-don'));
assert.ok(!rankProductCandidates(products, 'cà chua nhỏ').some((entry) => ['ca-chem', 'choi-lua'].includes(entry.product.id)));
assert.deepEqual(rankProductCandidates(products, 'cà rốt').map((entry) => entry.product.id), ['ca-rot']);
console.log('Product matcher ranking: PASS');
