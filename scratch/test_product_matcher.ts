import assert from 'node:assert/strict';
import { rankProductCandidates } from '../lib/order-import/product-match';

const base = { id: '', sku: '', unit: 'Kg', active: true, min_order_qty: 1, order_step: 1, enforce_order_step: false, packaging_note: null, quantity_precision: 3 };
const products = [
  { ...base, id: 'susu', sku: 'r-susu', name: 'Su su' },
  { ...base, id: 'dotsusu', sku: 'r-dotsusu', name: 'Đọt su su' },
  { ...base, id: 'hanhla', sku: 'r-hanhla', name: 'Hành lá (Kg)' },
  { ...base, id: 'hanhbaro', sku: 'r-hanhbaro', name: 'Hành baro' },
];

assert.equal(rankProductCandidates(products, 'susu')[0]?.product.id, 'susu');
assert.equal(rankProductCandidates(products, 'su su')[0]?.product.id, 'susu');
assert.equal(rankProductCandidates(products, 'Hành lá')[0]?.product.id, 'hanhla');
console.log('Product matcher ranking: PASS');
