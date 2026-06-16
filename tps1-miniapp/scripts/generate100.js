import fs from 'fs';
import path from 'path';

const categories = ['rau-cu', 'thit', 'hai-san', 'ga-vit', 'dong-lanh', 'gia-vi'];

// 48 existing products
const existingProducts = [
  { "id": "p001", "name": "Cà chua", "nameEn": "Tomatoes", "category": "rau-cu", "unit": "kg", "price": 25000 },
  { "id": "p002", "name": "Cà rốt Đà Lạt", "nameEn": "Dalat Carrots", "category": "rau-cu", "unit": "kg", "price": 22000 },
  { "id": "p003", "name": "Khoai tây vàng", "nameEn": "Yellow Potatoes", "category": "rau-cu", "unit": "kg", "price": 28000 },
  { "id": "p004", "name": "Bí đỏ", "nameEn": "Pumpkin", "category": "rau-cu", "unit": "kg", "price": 20000 },
  { "id": "p005", "name": "Hành tây", "nameEn": "Yellow Onions", "category": "rau-cu", "unit": "kg", "price": 18000 },
  { "id": "p006", "name": "Rau muống", "nameEn": "Water Spinach", "category": "rau-cu", "unit": "kg", "price": 15000 },
  { "id": "p007", "name": "Bắp cải trắng", "nameEn": "White Cabbage", "category": "rau-cu", "unit": "kg", "price": 18000 },
  { "id": "p008", "name": "Súp lơ xanh", "nameEn": "Broccoli", "category": "rau-cu", "unit": "kg", "price": 35000 },
  { "id": "p009", "name": "Ớt chuông đỏ", "nameEn": "Red Bell Peppers", "category": "rau-cu", "unit": "kg", "price": 45000 },
  { "id": "p010", "name": "Tỏi Bắc", "nameEn": "Garlic", "category": "rau-cu", "unit": "kg", "price": 55000 },
  { "id": "p011", "name": "Chanh không hạt", "nameEn": "Seedless Limes", "category": "rau-cu", "unit": "kg", "price": 20000 },
  { "id": "p012", "name": "Xà lách lolo", "nameEn": "Lollo Rosso Lettuce", "category": "rau-cu", "unit": "kg", "price": 30000 },
  { "id": "p013", "name": "Nạc dăm heo", "nameEn": "Pork Collar", "category": "thit", "unit": "kg", "price": 140000 },
  { "id": "p014", "name": "Ba rọi heo rút sườn", "nameEn": "Pork Belly (Ribs removed)", "category": "thit", "unit": "kg", "price": 165000 },
  { "id": "p015", "name": "Sườn non heo", "nameEn": "Pork Spare Ribs", "category": "thit", "unit": "kg", "price": 175000 },
  { "id": "p016", "name": "Thịt bò Úc (Thăn)", "nameEn": "Aussie Beef Steak", "category": "thit", "unit": "kg", "price": 250000 },
  { "id": "p017", "name": "Bắp bò", "nameEn": "Beef Shank", "category": "thit", "unit": "kg", "price": 220000 },
  { "id": "p018", "name": "Xương ống heo", "nameEn": "Pork Tube Bones", "category": "thit", "unit": "kg", "price": 80000 },
  { "id": "p019", "name": "Thịt heo xay", "nameEn": "Minced Pork", "category": "thit", "unit": "kg", "price": 120000 },
  { "id": "p020", "name": "Thăn bò ngoại", "nameEn": "Beef Striploin", "category": "thit", "unit": "kg", "price": 280000 },
  { "id": "p021", "name": "Cá hồi tươi (Fillet)", "nameEn": "Fresh Salmon (Fillet)", "category": "hai-san", "unit": "kg", "price": 320000 },
  { "id": "p022", "name": "Tôm sú size lớn", "nameEn": "Large Tiger Shrimp", "category": "hai-san", "unit": "kg", "price": 280000 },
  { "id": "p023", "name": "Mực ống", "nameEn": "Squid", "category": "hai-san", "unit": "kg", "price": 250000 },
  { "id": "p024", "name": "Bạch tuộc", "nameEn": "Octopus", "category": "hai-san", "unit": "kg", "price": 180000 },
  { "id": "p025", "name": "Cá basa (Fillet)", "nameEn": "Basa Fish (Fillet)", "category": "hai-san", "unit": "kg", "price": 65000 },
  { "id": "p026", "name": "Cá thu cắt lát", "nameEn": "Sliced Mackerel", "category": "hai-san", "unit": "kg", "price": 220000 },
  { "id": "p027", "name": "Ngao hai cùi", "nameEn": "Hard Clams", "category": "hai-san", "unit": "kg", "price": 120000 },
  { "id": "p028", "name": "Cua biển thịt", "nameEn": "Meat Crab", "category": "hai-san", "unit": "kg", "price": 450000 },
  { "id": "p029", "name": "Gà ta nguyên con", "nameEn": "Whole Free-range Chicken", "category": "ga-vit", "unit": "con", "price": 150000 },
  { "id": "p030", "name": "Đùi gà", "nameEn": "Chicken Drumsticks", "category": "ga-vit", "unit": "kg", "price": 65000 },
  { "id": "p031", "name": "Cánh gà", "nameEn": "Chicken Wings", "category": "ga-vit", "unit": "kg", "price": 85000 },
  { "id": "p032", "name": "Trứng gà ta", "nameEn": "Free-range Eggs", "category": "ga-vit", "unit": "vỉ", "price": 90000 },
  { "id": "p033", "name": "Trứng cút", "nameEn": "Quail Eggs", "category": "ga-vit", "unit": "vỉ", "price": 45000 },
  { "id": "p034", "name": "Ức gà phi lê", "nameEn": "Chicken Breast Fillet", "category": "ga-vit", "unit": "kg", "price": 75000 },
  { "id": "p035", "name": "Xúc xích Đức Việt", "nameEn": "Duc Viet Sausages", "category": "dong-lanh", "unit": "gói", "price": 55000 },
  { "id": "p036", "name": "Chả giò rế", "nameEn": "Net Spring Rolls", "category": "dong-lanh", "unit": "gói", "price": 85000 },
  { "id": "p037", "name": "Cá viên chiên", "nameEn": "Fried Fish Balls", "category": "dong-lanh", "unit": "gói", "price": 70000 },
  { "id": "p038", "name": "Khoai tây chiên", "nameEn": "French Fries", "category": "dong-lanh", "unit": "gói", "price": 110000 },
  { "id": "p039", "name": "Há cảo tôm thịt", "nameEn": "Shrimp & Pork Dumplings", "category": "dong-lanh", "unit": "gói", "price": 120000 },
  { "id": "p040", "name": "Phô mai que", "nameEn": "Cheese Sticks", "category": "dong-lanh", "unit": "gói", "price": 95000 },
  { "id": "p041", "name": "Bò viên", "nameEn": "Beef Balls", "category": "dong-lanh", "unit": "gói", "price": 85000 },
  { "id": "p042", "name": "Nước mắm Nam Ngư", "nameEn": "Nam Ngu Fish Sauce", "category": "gia-vi", "unit": "chai", "price": 45000 },
  { "id": "p043", "name": "Dầu ăn Tường An", "nameEn": "Tuong An Cooking Oil", "category": "gia-vi", "unit": "can", "price": 250000 },
  { "id": "p044", "name": "Tương ớt Chinsu", "nameEn": "Chinsu Chili Sauce", "category": "gia-vi", "unit": "chai", "price": 25000 },
  { "id": "p045", "name": "Đường tinh luyện", "nameEn": "Refined Sugar", "category": "gia-vi", "unit": "kg", "price": 22000 },
  { "id": "p046", "name": "Bột ngọt Ajinomoto", "nameEn": "Ajinomoto MSG", "category": "gia-vi", "unit": "gói", "price": 65000 },
  { "id": "p047", "name": "Tiêu sọ", "nameEn": "White Peppercorns", "category": "gia-vi", "unit": "hũ", "price": 85000 },
  { "id": "p048", "name": "Muối i-ốt", "nameEn": "Iodized Salt", "category": "gia-vi", "unit": "gói", "price": 8000 }
];

const generated = [...existingProducts];

// Helper to generate a random number
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generate up to 100
for (let i = 49; i <= 100; i++) {
  const cat = categories[rnd(0, categories.length - 1)];
  generated.push({
    id: `p${i.toString().padStart(3, '0')}`,
    name: `Sản phẩm ${cat} ${i}`,
    nameEn: `Product ${cat} ${i}`,
    category: cat,
    unit: 'kg',
    price: rnd(10, 300) * 1000,
  });
}

// Map them to final structure
const finalProducts = generated.map((p, idx) => {
  const imagePath = `/images/gen/${p.category}.png`;

  return {
    ...p,
    views: rnd(100, 1000),
    sold: rnd(10, 500),
    image: imagePath
  };
});

const content = `export const GENERATED_PRODUCTS = ${JSON.stringify(finalProducts, null, 2)};\n`;
fs.writeFileSync(path.resolve(process.cwd(), 'src/data/products.js'), content, 'utf8');
console.log('Successfully generated 100 products!');
