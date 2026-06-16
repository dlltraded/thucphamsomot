const fs = require('fs');

const baseProducts = [
  // Rau Củ Quả
  { name: 'Rau muống tươi', category: 'rau-cu', unit: 'kg', price: 15000 },
  { name: 'Cải thìa (VietGAP)', category: 'rau-cu', unit: 'kg', price: 25000 },
  { name: 'Bắp cải trắng', category: 'rau-cu', unit: 'kg', price: 18000 },
  { name: 'Cà rốt Đà Lạt', category: 'rau-cu', unit: 'kg', price: 22000 },
  { name: 'Khoai tây vàng', category: 'rau-cu', unit: 'kg', price: 28000 },
  { name: 'Cà chua', category: 'rau-cu', unit: 'kg', price: 30000 },
  { name: 'Xà lách mỡ', category: 'rau-cu', unit: 'kg', price: 35000 },
  { name: 'Bí đỏ', category: 'rau-cu', unit: 'kg', price: 20000 },
  { name: 'Củ cải trắng', category: 'rau-cu', unit: 'kg', price: 15000 },
  { name: 'Dưa leo', category: 'rau-cu', unit: 'kg', price: 18000 },

  // Thịt
  { name: 'Thịt heo nạc vai', category: 'thit', unit: 'kg', price: 110000 },
  { name: 'Ba rọi heo (Rút sườn)', category: 'thit', unit: 'kg', price: 145000 },
  { name: 'Sườn non heo', category: 'thit', unit: 'kg', price: 165000 },
  { name: 'Bò Úc nhập khẩu', category: 'thit', unit: 'kg', price: 250000 },
  { name: 'Bắp bò', category: 'thit', unit: 'kg', price: 220000 },
  { name: 'Nạc dăm', category: 'thit', unit: 'kg', price: 140000 },
  { name: 'Xương ống', category: 'thit', unit: 'kg', price: 80000 },
  { name: 'Thịt đùi heo', category: 'thit', unit: 'kg', price: 105000 },

  // Hải Sản
  { name: 'Cá hồi tươi nguyên con', category: 'hai-san', unit: 'kg', price: 300000 },
  { name: 'Tôm sú size lớn', category: 'hai-san', unit: 'kg', price: 280000 },
  { name: 'Mực ống Phan Thiết', category: 'hai-san', unit: 'kg', price: 250000 },
  { name: 'Cá basa fillet', category: 'hai-san', unit: 'kg', price: 65000 },
  { name: 'Bạch tuộc', category: 'hai-san', unit: 'kg', price: 180000 },
  { name: 'Ngao hai cùi', category: 'hai-san', unit: 'kg', price: 120000 },
  { name: 'Cá thu', category: 'hai-san', unit: 'kg', price: 220000 },

  // Gia Cầm
  { name: 'Gà thả vườn (nguyên con)', category: 'ga-vit', unit: 'con', price: 180000 },
  { name: 'Gà ta nguyên con', category: 'ga-vit', unit: 'con', price: 120000 },
  { name: 'Đùi gà công nghiệp', category: 'ga-vit', unit: 'kg', price: 45000 },
  { name: 'Cánh gà', category: 'ga-vit', unit: 'kg', price: 65000 },
  { name: 'Ức gà phi lê', category: 'ga-vit', unit: 'kg', price: 55000 },
  { name: 'Trứng gà ta', category: 'ga-vit', unit: 'vỉ', price: 90000 },
  { name: 'Vịt quay', category: 'ga-vit', unit: 'con', price: 250000 },

  // Đông Lạnh
  { name: 'Xúc xích Đức Việt', category: 'dong-lanh', unit: 'gói', price: 55000 },
  { name: 'Há cảo tôm thịt', category: 'dong-lanh', unit: 'gói', price: 120000 },
  { name: 'Khoai tây chiên sợi', category: 'dong-lanh', unit: 'gói', price: 110000 },
  { name: 'Chả giò rế', category: 'dong-lanh', unit: 'gói', price: 85000 },
  { name: 'Cá viên chiên', category: 'dong-lanh', unit: 'gói', price: 70000 },
  { name: 'Phô mai que', category: 'dong-lanh', unit: 'gói', price: 95000 },
  { name: 'Thịt xông khói', category: 'dong-lanh', unit: 'gói', price: 150000 },

  // Gia Vị
  { name: 'Nước mắm Nam Ngư', category: 'gia-vi', unit: 'chai', price: 45000 },
  { name: 'Dầu ăn Tường An', category: 'gia-vi', unit: 'can', price: 250000 },
  { name: 'Bột ngọt Ajinomoto', category: 'gia-vi', unit: 'gói', price: 65000 },
  { name: 'Tương ớt Chinsu', category: 'gia-vi', unit: 'chai', price: 25000 },
  { name: 'Đường tinh luyện', category: 'gia-vi', unit: 'kg', price: 22000 },
  { name: 'Muối i-ốt', category: 'gia-vi', unit: 'kg', price: 8000 },
  { name: 'Tiêu sọ', category: 'gia-vi', unit: 'hũ', price: 50000 },
];

const categoryKeywords = {
  'rau-cu': 'vegetables,fresh',
  'thit': 'meat,beef,pork',
  'hai-san': 'seafood,fish,shrimp',
  'ga-vit': 'chicken,poultry',
  'dong-lanh': 'frozen,food,sausage',
  'gia-vi': 'sauce,spices,ingredients'
};

const products = [];
let count = 0;

while (products.length < 500) {
  for (const base of baseProducts) {
    if (products.length >= 500) break;
    count++;
    
    // Create variations
    let name = base.name;
    if (count > baseProducts.length) {
      name = `${base.name} Loại ${Math.floor(count / baseProducts.length) + 1}`;
    }
    
    // Vary price slightly
    const priceVariation = 1 + (Math.random() * 0.2 - 0.1); // +/- 10%
    const price = Math.round((base.price * priceVariation) / 1000) * 1000;
    // Distinct random image for each item from local images
    const imageIndex = (count % 5) + 1; // 1 to 5
    const image = `./images/${base.category}-${imageIndex}.jpg`;
    
    products.push({
      id: `p${count.toString().padStart(4, '0')}`,
      name,
      category: base.category,
      unit: base.unit,
      price,
      views: Math.floor(Math.random() * 1000),
      sold: Math.floor(Math.random() * 500),
      image
    });
  }
}

const fileContent = `export const GENERATED_PRODUCTS = ${JSON.stringify(products, null, 2)};\n`;
fs.writeFileSync('./src/data/products.js', fileContent);
console.log('Generated 500 unique products!');
