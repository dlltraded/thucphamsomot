const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const coreProducts = [
  // Rau Củ
  { id: 'p001', name: 'Cà chua', nameEn: 'Tomatoes', cat: 'rau-cu', unit: 'kg', price: 25000, prompt: 'fresh ripe tomatoes on white background' },
  { id: 'p002', name: 'Cà rốt Đà Lạt', nameEn: 'Dalat Carrots', cat: 'rau-cu', unit: 'kg', price: 22000, prompt: 'fresh carrots with leaves on white background' },
  { id: 'p003', name: 'Khoai tây vàng', nameEn: 'Yellow Potatoes', cat: 'rau-cu', unit: 'kg', price: 28000, prompt: 'fresh potatoes on wooden table' },
  { id: 'p004', name: 'Bí đỏ', nameEn: 'Pumpkin', cat: 'rau-cu', unit: 'kg', price: 20000, prompt: 'whole pumpkin isolated' },
  { id: 'p005', name: 'Hành tây', nameEn: 'Yellow Onions', cat: 'rau-cu', unit: 'kg', price: 18000, prompt: 'fresh yellow onions on white background' },
  { id: 'p006', name: 'Rau muống', nameEn: 'Water Spinach', cat: 'rau-cu', unit: 'kg', price: 15000, prompt: 'fresh water spinach bundle' },
  { id: 'p007', name: 'Bắp cải trắng', nameEn: 'White Cabbage', cat: 'rau-cu', unit: 'kg', price: 18000, prompt: 'fresh green cabbage head' },
  { id: 'p008', name: 'Súp lơ xanh', nameEn: 'Broccoli', cat: 'rau-cu', unit: 'kg', price: 35000, prompt: 'fresh green broccoli head' },
  { id: 'p009', name: 'Ớt chuông đỏ', nameEn: 'Red Bell Peppers', cat: 'rau-cu', unit: 'kg', price: 45000, prompt: 'fresh red bell peppers' },
  { id: 'p010', name: 'Tỏi Bắc', nameEn: 'Garlic', cat: 'rau-cu', unit: 'kg', price: 55000, prompt: 'garlic bulbs on white background' },
  { id: 'p011', name: 'Chanh không hạt', nameEn: 'Seedless Limes', cat: 'rau-cu', unit: 'kg', price: 20000, prompt: 'fresh green lemons limes' },
  { id: 'p012', name: 'Xà lách lolo', nameEn: 'Lollo Rosso Lettuce', cat: 'rau-cu', unit: 'kg', price: 30000, prompt: 'fresh green lettuce leaves' },

  // Thịt
  { id: 'p013', name: 'Nạc dăm heo', nameEn: 'Pork Collar', cat: 'thit', unit: 'kg', price: 140000, prompt: 'raw pork collar meat slice' },
  { id: 'p014', name: 'Ba rọi heo rút sườn', nameEn: 'Pork Belly (Ribs removed)', cat: 'thit', unit: 'kg', price: 165000, prompt: 'raw pork belly slice' },
  { id: 'p015', name: 'Sườn non heo', nameEn: 'Pork Spare Ribs', cat: 'thit', unit: 'kg', price: 175000, prompt: 'raw pork ribs' },
  { id: 'p016', name: 'Thịt bò Úc (Thăn)', nameEn: 'Aussie Beef Steak', cat: 'thit', unit: 'kg', price: 250000, prompt: 'raw beef steak meat' },
  { id: 'p017', name: 'Bắp bò', nameEn: 'Beef Shank', cat: 'thit', unit: 'kg', price: 220000, prompt: 'raw beef shank meat' },
  { id: 'p018', name: 'Xương ống heo', nameEn: 'Pork Tube Bones', cat: 'thit', unit: 'kg', price: 80000, prompt: 'raw pork bones for soup' },
  { id: 'p019', name: 'Thịt heo xay', nameEn: 'Minced Pork', cat: 'thit', unit: 'kg', price: 120000, prompt: 'raw minced pork meat' },
  { id: 'p020', name: 'Thăn bò ngoại', nameEn: 'Beef Striploin', cat: 'thit', unit: 'kg', price: 280000, prompt: 'raw beef tenderloin piece' },

  // Hải Sản
  { id: 'p021', name: 'Cá hồi tươi (Fillet)', nameEn: 'Fresh Salmon (Fillet)', cat: 'hai-san', unit: 'kg', price: 320000, prompt: 'raw salmon fillet meat' },
  { id: 'p022', name: 'Tôm sú size lớn', nameEn: 'Large Tiger Shrimp', cat: 'hai-san', unit: 'kg', price: 280000, prompt: 'raw fresh tiger shrimp' },
  { id: 'p023', name: 'Mực ống', nameEn: 'Squid', cat: 'hai-san', unit: 'kg', price: 250000, prompt: 'raw fresh squid' },
  { id: 'p024', name: 'Bạch tuộc', nameEn: 'Octopus', cat: 'hai-san', unit: 'kg', price: 180000, prompt: 'raw fresh octopus' },
  { id: 'p025', name: 'Cá basa (Fillet)', nameEn: 'Basa Fish (Fillet)', cat: 'hai-san', unit: 'kg', price: 65000, prompt: 'raw white fish fillet' },
  { id: 'p026', name: 'Cá thu cắt lát', nameEn: 'Sliced Mackerel', cat: 'hai-san', unit: 'kg', price: 220000, prompt: 'raw mackerel fish steaks' },
  { id: 'p027', name: 'Ngao hai cùi', nameEn: 'Hard Clams', cat: 'hai-san', unit: 'kg', price: 120000, prompt: 'fresh raw clams' },
  { id: 'p028', name: 'Cua biển thịt', nameEn: 'Meat Crab', cat: 'hai-san', unit: 'kg', price: 450000, prompt: 'raw mud crab' },

  // Gà Vịt
  { id: 'p029', name: 'Gà ta nguyên con', nameEn: 'Whole Free-range Chicken', cat: 'ga-vit', unit: 'con', price: 150000, prompt: 'raw whole chicken meat' },
  { id: 'p030', name: 'Đùi gà', nameEn: 'Chicken Drumsticks', cat: 'ga-vit', unit: 'kg', price: 65000, prompt: 'raw chicken drumsticks' },
  { id: 'p031', name: 'Cánh gà', nameEn: 'Chicken Wings', cat: 'ga-vit', unit: 'kg', price: 85000, prompt: 'raw chicken wings' },
  { id: 'p032', name: 'Trứng gà ta', nameEn: 'Free-range Eggs', cat: 'ga-vit', unit: 'vỉ', price: 90000, prompt: 'fresh chicken eggs in carton' },
  { id: 'p033', name: 'Trứng cút', nameEn: 'Quail Eggs', cat: 'ga-vit', unit: 'vỉ', price: 45000, prompt: 'fresh quail eggs' },
  { id: 'p034', name: 'Ức gà phi lê', nameEn: 'Chicken Breast Fillet', cat: 'ga-vit', unit: 'kg', price: 75000, prompt: 'raw chicken breast fillet' },

  // Đông Lạnh
  { id: 'p035', name: 'Xúc xích Đức Việt', nameEn: 'Duc Viet Sausages', cat: 'dong-lanh', unit: 'gói', price: 55000, prompt: 'sausage links package' },
  { id: 'p036', name: 'Chả giò rế', nameEn: 'Net Spring Rolls', cat: 'dong-lanh', unit: 'gói', price: 85000, prompt: 'frozen spring rolls package' },
  { id: 'p037', name: 'Cá viên chiên', nameEn: 'Fried Fish Balls', cat: 'dong-lanh', unit: 'gói', price: 70000, prompt: 'frozen fish balls' },
  { id: 'p038', name: 'Khoai tây chiên', nameEn: 'French Fries', cat: 'dong-lanh', unit: 'gói', price: 110000, prompt: 'frozen french fries package' },
  { id: 'p039', name: 'Há cảo tôm thịt', nameEn: 'Shrimp & Pork Dumplings', cat: 'dong-lanh', unit: 'gói', price: 120000, prompt: 'frozen dumplings package' },
  { id: 'p040', name: 'Phô mai que', nameEn: 'Cheese Sticks', cat: 'dong-lanh', unit: 'gói', price: 95000, prompt: 'frozen mozzarella cheese sticks' },
  { id: 'p041', name: 'Bò viên', nameEn: 'Beef Balls', cat: 'dong-lanh', unit: 'gói', price: 85000, prompt: 'frozen beef balls' },

  // Gia Vị
  { id: 'p042', name: 'Nước mắm Nam Ngư', nameEn: 'Nam Ngu Fish Sauce', cat: 'gia-vi', unit: 'chai', price: 45000, prompt: 'fish sauce bottle on white background' },
  { id: 'p043', name: 'Dầu ăn Tường An', nameEn: 'Tuong An Cooking Oil', cat: 'gia-vi', unit: 'can', price: 250000, prompt: 'cooking oil bottle' },
  { id: 'p044', name: 'Tương ớt Chinsu', nameEn: 'Chinsu Chili Sauce', cat: 'gia-vi', unit: 'chai', price: 25000, prompt: 'red chili sauce bottle' },
  { id: 'p045', name: 'Đường tinh luyện', nameEn: 'Refined Sugar', cat: 'gia-vi', unit: 'kg', price: 22000, prompt: 'white sugar bowl' },
  { id: 'p046', name: 'Bột ngọt Ajinomoto', nameEn: 'Ajinomoto MSG', cat: 'gia-vi', unit: 'gói', price: 65000, prompt: 'msg powder bowl' },
  { id: 'p047', name: 'Tiêu sọ', nameEn: 'White Peppercorns', cat: 'gia-vi', unit: 'hũ', price: 85000, prompt: 'black peppercorns jar' },
  { id: 'p048', name: 'Muối i-ốt', nameEn: 'Iodized Salt', cat: 'gia-vi', unit: 'gói', price: 8000, prompt: 'white salt bowl' },
];

const imagesDir = path.join(__dirname, 'public', 'images', 'exact');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

function downloadImage(product) {
  const dest = path.join(imagesDir, `${product.id}.jpg`);
  if (!fs.existsSync(dest)) {
    console.log(`Downloading image for ${product.name}...`);
    const encodedPrompt = encodeURIComponent(product.prompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=300&height=300&nologo=true&seed=42`;
    try {
      execSync(`curl -L -s -o "${dest}" "${url}"`);
    } catch (e) {
      console.error(`Failed to download for ${product.name}`);
    }
  }
}

const finalProducts = [];

console.log('Starting exact image downloads...');
coreProducts.forEach(p => {
  downloadImage(p);
  finalProducts.push({
    id: p.id,
    name: p.name,
    nameEn: p.nameEn,
    category: p.cat,
    unit: p.unit,
    price: p.price,
    views: Math.floor(Math.random() * 1000),
    sold: Math.floor(Math.random() * 500),
    image: `./images/exact/${p.id}.jpg`
  });
});

const fileContent = `export const GENERATED_PRODUCTS = ${JSON.stringify(finalProducts, null, 2)};\n`;
fs.writeFileSync(path.join(__dirname, 'src', 'data', 'products.js'), fileContent);
console.log('Setup complete! 48 core products created with exact images.');
