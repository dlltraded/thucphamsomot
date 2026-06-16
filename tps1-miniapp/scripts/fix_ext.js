import fs from 'fs';
const file = 'src/data/products.js';
const content = fs.readFileSync(file, 'utf8');
const updated = content.replaceAll('/images/products/p', '/images/products/p').replace(/\.png/g, '.jpg');
fs.writeFileSync(file, updated, 'utf8');
console.log('Updated all .png to .jpg in products.js');
// verify
const count = (updated.match(/\.jpg/g) || []).length;
console.log(`Found ${count} .jpg references`);
