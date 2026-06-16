import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const PRODUCTS = [
  // RAU CỦ
  { id: "p001", name: "Cà chua", name_en: "Fresh Tomatoes", category: "rau-cu", unit: "kg", price: 25000, views: 346, sold: 348, image_url: "/images/products/p001.jpg" },
  { id: "p002", name: "Cà rốt Đà Lạt", name_en: "Dalat Carrots", category: "rau-cu", unit: "kg", price: 22000, views: 287, sold: 382, image_url: "/images/products/p002.jpg" },
  { id: "p003", name: "Khoai tây vàng", name_en: "Yellow Potatoes", category: "rau-cu", unit: "kg", price: 28000, views: 994, sold: 210, image_url: "/images/products/p003.jpg" },
  { id: "p004", name: "Bí đỏ", name_en: "Pumpkin", category: "rau-cu", unit: "kg", price: 20000, views: 847, sold: 206, image_url: "/images/products/p004.jpg" },
  { id: "p005", name: "Hành tây", name_en: "Yellow Onions", category: "rau-cu", unit: "kg", price: 18000, views: 522, sold: 181, image_url: "/images/products/p005.jpg" },
  { id: "p006", name: "Rau muống", name_en: "Water Spinach", category: "rau-cu", unit: "kg", price: 15000, views: 164, sold: 457, image_url: "/images/products/p006.jpg" },
  { id: "p007", name: "Bắp cải trắng", name_en: "White Cabbage", category: "rau-cu", unit: "kg", price: 18000, views: 725, sold: 260, image_url: "/images/products/p007.jpg" },
  { id: "p008", name: "Súp lơ xanh", name_en: "Broccoli", category: "rau-cu", unit: "kg", price: 35000, views: 992, sold: 34, image_url: "/images/products/p008.jpg" },
  { id: "p009", name: "Ớt chuông đỏ", name_en: "Red Bell Pepper", category: "rau-cu", unit: "kg", price: 45000, views: 571, sold: 44, image_url: "/images/products/p009.jpg" },
  { id: "p010", name: "Tỏi Bắc", name_en: "Northern Garlic", category: "rau-cu", unit: "kg", price: 55000, views: 124, sold: 31, image_url: "/images/products/p010.jpg" },
  { id: "p011", name: "Chanh không hạt", name_en: "Seedless Limes", category: "rau-cu", unit: "kg", price: 20000, views: 260, sold: 37, image_url: "/images/products/p011.jpg" },
  { id: "p012", name: "Xà lách lolo", name_en: "Lollo Rosso Lettuce", category: "rau-cu", unit: "kg", price: 30000, views: 427, sold: 360, image_url: "/images/products/p012.jpg" },
  { id: "p049", name: "Cải thảo", name_en: "Napa Cabbage", category: "rau-cu", unit: "kg", price: 22000, views: 310, sold: 145, image_url: "/images/products/p049.jpg" },
  { id: "p050", name: "Đậu bắp", name_en: "Okra", category: "rau-cu", unit: "kg", price: 25000, views: 280, sold: 198, image_url: "/images/products/p050.jpg" },
  { id: "p051", name: "Ngô ngọt", name_en: "Sweet Corn", category: "rau-cu", unit: "trái", price: 8000, views: 540, sold: 620, image_url: "/images/products/p051.jpg" },
  { id: "p052", name: "Khoai lang tím", name_en: "Purple Sweet Potato", category: "rau-cu", unit: "kg", price: 32000, views: 390, sold: 175, image_url: "/images/products/p052.jpg" },
  { id: "p053", name: "Rau cần tây", name_en: "Celery", category: "rau-cu", unit: "bó", price: 18000, views: 210, sold: 132, image_url: "/images/products/p053.jpg" },
  { id: "p054", name: "Mướp hương", name_en: "Luffa (Sponge Gourd)", category: "rau-cu", unit: "kg", price: 15000, views: 185, sold: 245, image_url: "/images/products/p054.jpg" },
  // THỊT
  { id: "p013", name: "Nạc dăm heo", name_en: "Pork Collar", category: "thit", unit: "kg", price: 140000, views: 431, sold: 24, image_url: "/images/products/p013.jpg" },
  { id: "p014", name: "Ba rọi heo rút sườn", name_en: "Pork Belly Boneless", category: "thit", unit: "kg", price: 165000, views: 493, sold: 117, image_url: "/images/products/p014.jpg" },
  { id: "p015", name: "Sườn non heo", name_en: "Pork Spare Ribs", category: "thit", unit: "kg", price: 175000, views: 997, sold: 204, image_url: "/images/products/p015.jpg" },
  { id: "p016", name: "Thịt bò Úc (Thăn)", name_en: "Australian Beef Sirloin", category: "thit", unit: "kg", price: 250000, views: 268, sold: 265, image_url: "/images/products/p016.jpg" },
  { id: "p017", name: "Bắp bò", name_en: "Beef Shank", category: "thit", unit: "kg", price: 220000, views: 427, sold: 207, image_url: "/images/products/p017.jpg" },
  { id: "p018", name: "Xương ống heo", name_en: "Pork Marrow Bones", category: "thit", unit: "kg", price: 80000, views: 196, sold: 348, image_url: "/images/products/p018.jpg" },
  { id: "p019", name: "Thịt heo xay", name_en: "Ground Pork", category: "thit", unit: "kg", price: 120000, views: 930, sold: 333, image_url: "/images/products/p019.jpg" },
  { id: "p020", name: "Thăn bò ngoại", name_en: "Beef Striploin", category: "thit", unit: "kg", price: 280000, views: 271, sold: 193, image_url: "/images/products/p020.jpg" },
  { id: "p055", name: "Thịt bò xay", name_en: "Ground Beef", category: "thit", unit: "kg", price: 180000, views: 312, sold: 155, image_url: "/images/products/p055.jpg" },
  { id: "p056", name: "Cốt lết heo", name_en: "Pork Chops", category: "thit", unit: "kg", price: 155000, views: 278, sold: 189, image_url: "/images/products/p056.jpg" },
  { id: "p057", name: "Nạc vai heo", name_en: "Pork Shoulder", category: "thit", unit: "kg", price: 135000, views: 345, sold: 221, image_url: "/images/products/p057.jpg" },
  { id: "p058", name: "Gan heo", name_en: "Pork Liver", category: "thit", unit: "kg", price: 70000, views: 156, sold: 98, image_url: "/images/products/p058.jpg" },
  { id: "p059", name: "Gân bò", name_en: "Beef Tendon", category: "thit", unit: "kg", price: 160000, views: 423, sold: 167, image_url: "/images/products/p059.jpg" },
  { id: "p060", name: "Thịt dê (Đùi)", name_en: "Goat Leg Meat", category: "thit", unit: "kg", price: 200000, views: 389, sold: 88, image_url: "/images/products/p060.jpg" },
  // HẢI SẢN
  { id: "p021", name: "Cá hồi tươi (Fillet)", name_en: "Fresh Salmon Fillet", category: "hai-san", unit: "kg", price: 320000, views: 890, sold: 206, image_url: "/images/products/p021.jpg" },
  { id: "p022", name: "Tôm sú size lớn", name_en: "Large Black Tiger Shrimp", category: "hai-san", unit: "kg", price: 280000, views: 363, sold: 151, image_url: "/images/products/p022.jpg" },
  { id: "p023", name: "Mực ống", name_en: "Squid Tubes", category: "hai-san", unit: "kg", price: 250000, views: 345, sold: 31, image_url: "/images/products/p023.jpg" },
  { id: "p024", name: "Bạch tuộc", name_en: "Octopus", category: "hai-san", unit: "kg", price: 180000, views: 721, sold: 191, image_url: "/images/products/p024.jpg" },
  { id: "p025", name: "Cá basa (Fillet)", name_en: "Basa Catfish Fillet", category: "hai-san", unit: "kg", price: 65000, views: 294, sold: 254, image_url: "/images/products/p025.jpg" },
  { id: "p026", name: "Cá thu cắt lát", name_en: "Sliced King Mackerel", category: "hai-san", unit: "kg", price: 220000, views: 338, sold: 440, image_url: "/images/products/p026.jpg" },
  { id: "p027", name: "Ngao hai cùi", name_en: "Fresh Clams", category: "hai-san", unit: "kg", price: 120000, views: 339, sold: 282, image_url: "/images/products/p027.jpg" },
  { id: "p028", name: "Cua biển thịt", name_en: "Sea Crab (Meat Full)", category: "hai-san", unit: "kg", price: 450000, views: 509, sold: 6, image_url: "/images/products/p028.jpg" },
  { id: "p061", name: "Tôm thẻ chân trắng", name_en: "White Leg Shrimp", category: "hai-san", unit: "kg", price: 180000, views: 412, sold: 198, image_url: "/images/products/p061.jpg" },
  { id: "p062", name: "Cá chẽm", name_en: "Sea Bass (Barramundi)", category: "hai-san", unit: "kg", price: 160000, views: 356, sold: 134, image_url: "/images/products/p062.jpg" },
  { id: "p063", name: "Tôm hùm Baby", name_en: "Baby Lobster", category: "hai-san", unit: "con", price: 350000, views: 678, sold: 45, image_url: "/images/products/p063.jpg" },
  { id: "p064", name: "Hàu biển", name_en: "Fresh Oysters", category: "hai-san", unit: "kg", price: 200000, views: 489, sold: 122, image_url: "/images/products/p064.jpg" },
  { id: "p065", name: "Cá ngừ (Loin)", name_en: "Tuna Loin", category: "hai-san", unit: "kg", price: 280000, views: 534, sold: 89, image_url: "/images/products/p065.jpg" },
  { id: "p066", name: "Ghẹ xanh", name_en: "Blue Swimmer Crab", category: "hai-san", unit: "kg", price: 320000, views: 445, sold: 67, image_url: "/images/products/p066.jpg" },
  // GÀ VỊT
  { id: "p029", name: "Gà ta nguyên con", name_en: "Whole Free-range Chicken", category: "ga-vit", unit: "con", price: 150000, views: 754, sold: 342, image_url: "/images/products/p029.jpg" },
  { id: "p030", name: "Đùi gà", name_en: "Chicken Drumsticks", category: "ga-vit", unit: "kg", price: 65000, views: 291, sold: 64, image_url: "/images/products/p030.jpg" },
  { id: "p031", name: "Cánh gà", name_en: "Chicken Wings", category: "ga-vit", unit: "kg", price: 85000, views: 273, sold: 141, image_url: "/images/products/p031.jpg" },
  { id: "p032", name: "Trứng gà ta", name_en: "Free-range Chicken Eggs", category: "ga-vit", unit: "vỉ 10", price: 90000, views: 322, sold: 251, image_url: "/images/products/p032.jpg" },
  { id: "p033", name: "Trứng cút", name_en: "Quail Eggs", category: "ga-vit", unit: "vỉ 30", price: 45000, views: 426, sold: 90, image_url: "/images/products/p033.jpg" },
  { id: "p034", name: "Ức gà phi lê", name_en: "Chicken Breast Fillet", category: "ga-vit", unit: "kg", price: 75000, views: 323, sold: 291, image_url: "/images/products/p034.jpg" },
  { id: "p067", name: "Vịt nguyên con", name_en: "Whole Duck", category: "ga-vit", unit: "con", price: 170000, views: 445, sold: 112, image_url: "/images/products/p067.jpg" },
  { id: "p068", name: "Gà công nghiệp", name_en: "Broiler Chicken", category: "ga-vit", unit: "con", price: 100000, views: 567, sold: 234, image_url: "/images/products/p068.jpg" },
  { id: "p069", name: "Chân gà", name_en: "Chicken Feet", category: "ga-vit", unit: "kg", price: 55000, views: 312, sold: 178, image_url: "/images/products/p069.jpg" },
  { id: "p070", name: "Trứng vịt muối", name_en: "Salted Duck Eggs", category: "ga-vit", unit: "trứng", price: 12000, views: 234, sold: 456, image_url: "/images/products/p070.jpg" },
  { id: "p071", name: "Lòng gà", name_en: "Chicken Giblets", category: "ga-vit", unit: "kg", price: 50000, views: 178, sold: 89, image_url: "/images/products/p071.jpg" },
  { id: "p072", name: "Xương gà hầm", name_en: "Chicken Carcass (for broth)", category: "ga-vit", unit: "kg", price: 40000, views: 145, sold: 223, image_url: "/images/products/p072.jpg" },
  // ĐÔNG LẠNH
  { id: "p035", name: "Xúc xích Đức Việt", name_en: "Duc Viet German Sausage", category: "dong-lanh", unit: "gói", price: 55000, views: 932, sold: 95, image_url: "/images/products/p035.jpg" },
  { id: "p036", name: "Chả giò rế", name_en: "Crispy Net Spring Rolls", category: "dong-lanh", unit: "gói", price: 85000, views: 746, sold: 210, image_url: "/images/products/p036.jpg" },
  { id: "p037", name: "Cá viên chiên", name_en: "Fried Fish Cake Balls", category: "dong-lanh", unit: "gói", price: 70000, views: 361, sold: 394, image_url: "/images/products/p037.jpg" },
  { id: "p038", name: "Khoai tây chiên đông lạnh", name_en: "Frozen French Fries", category: "dong-lanh", unit: "gói", price: 110000, views: 286, sold: 31, image_url: "/images/products/p038.jpg" },
  { id: "p039", name: "Há cảo tôm thịt", name_en: "Shrimp & Pork Dim Sum", category: "dong-lanh", unit: "gói", price: 120000, views: 837, sold: 220, image_url: "/images/products/p039.jpg" },
  { id: "p040", name: "Phô mai que", name_en: "Mozzarella Cheese Sticks", category: "dong-lanh", unit: "gói", price: 95000, views: 240, sold: 277, image_url: "/images/products/p040.jpg" },
  { id: "p041", name: "Bò viên", name_en: "Beef Meatballs", category: "dong-lanh", unit: "gói", price: 85000, views: 737, sold: 200, image_url: "/images/products/p041.jpg" },
  { id: "p073", name: "Tôm chiên xù đông lạnh", name_en: "Frozen Breaded Shrimp", category: "dong-lanh", unit: "gói", price: 130000, views: 456, sold: 178, image_url: "/images/products/p073.jpg" },
  { id: "p074", name: "Chả lụa đông lạnh", name_en: "Frozen Vietnamese Ham", category: "dong-lanh", unit: "cái", price: 75000, views: 389, sold: 234, image_url: "/images/products/p074.jpg" },
  { id: "p075", name: "Cá hồi phi lê đông lạnh", name_en: "Frozen Salmon Fillet", category: "dong-lanh", unit: "gói", price: 250000, views: 567, sold: 89, image_url: "/images/products/p075.jpg" },
  { id: "p076", name: "Gà viên đông lạnh", name_en: "Frozen Chicken Nuggets", category: "dong-lanh", unit: "gói", price: 90000, views: 678, sold: 312, image_url: "/images/products/p076.jpg" },
  { id: "p077", name: "Sủi cảo đông lạnh", name_en: "Frozen Wontons", category: "dong-lanh", unit: "gói", price: 75000, views: 345, sold: 198, image_url: "/images/products/p077.jpg" },
  { id: "p078", name: "Pizza đông lạnh", name_en: "Frozen Mini Pizza", category: "dong-lanh", unit: "cái", price: 120000, views: 423, sold: 145, image_url: "/images/products/p078.jpg" },
  // GIA VỊ
  { id: "p042", name: "Nước mắm Nam Ngư", name_en: "Nam Ngu Fish Sauce", category: "gia-vi", unit: "chai 500ml", price: 45000, views: 946, sold: 155, image_url: "/images/products/p042.jpg" },
  { id: "p043", name: "Dầu ăn Tường An 5L", name_en: "Tuong An Cooking Oil 5L", category: "gia-vi", unit: "can", price: 250000, views: 752, sold: 298, image_url: "/images/products/p043.jpg" },
  { id: "p044", name: "Tương ớt Chinsu", name_en: "Chinsu Chili Sauce", category: "gia-vi", unit: "chai", price: 25000, views: 598, sold: 435, image_url: "/images/products/p044.jpg" },
  { id: "p045", name: "Đường tinh luyện Biên Hòa", name_en: "Bien Hoa Refined Sugar", category: "gia-vi", unit: "kg", price: 22000, views: 190, sold: 153, image_url: "/images/products/p045.jpg" },
  { id: "p046", name: "Bột ngọt Ajinomoto", name_en: "Ajinomoto MSG 454g", category: "gia-vi", unit: "gói", price: 65000, views: 686, sold: 288, image_url: "/images/products/p046.jpg" },
  { id: "p047", name: "Tiêu sọ Phú Quốc", name_en: "Phu Quoc White Peppercorns", category: "gia-vi", unit: "hũ", price: 85000, views: 740, sold: 98, image_url: "/images/products/p047.jpg" },
  { id: "p048", name: "Muối i-ốt Masan", name_en: "Masan Iodized Salt", category: "gia-vi", unit: "gói", price: 8000, views: 633, sold: 14, image_url: "/images/products/p048.jpg" },
  { id: "p079", name: "Nước tương Maggi", name_en: "Maggi Soy Sauce", category: "gia-vi", unit: "chai", price: 30000, views: 512, sold: 367, image_url: "/images/products/p079.jpg" },
  { id: "p080", name: "Hạt nêm Knorr gà", name_en: "Knorr Chicken Seasoning", category: "gia-vi", unit: "gói", price: 55000, views: 634, sold: 289, image_url: "/images/products/p080.jpg" },
  { id: "p081", name: "Dấm gạo Việt Nam", name_en: "Vietnamese Rice Vinegar", category: "gia-vi", unit: "chai", price: 18000, views: 234, sold: 178, image_url: "/images/products/p081.jpg" },
  { id: "p082", name: "Bơ Anchor", name_en: "Anchor Butter 200g", category: "gia-vi", unit: "hộp", price: 85000, views: 456, sold: 234, image_url: "/images/products/p082.jpg" },
  { id: "p083", name: "Mật ong nguyên chất", name_en: "Pure Honey 500g", category: "gia-vi", unit: "hũ", price: 150000, views: 567, sold: 123, image_url: "/images/products/p083.jpg" },
  { id: "p084", name: "Nước cốt dừa Chaokoh", name_en: "Chaokoh Coconut Cream", category: "gia-vi", unit: "hộp", price: 35000, views: 378, sold: 456, image_url: "/images/products/p084.jpg" },
  { id: "p085", name: "Sốt cà chua Heinz", name_en: "Heinz Tomato Ketchup", category: "gia-vi", unit: "chai", price: 55000, views: 489, sold: 312, image_url: "/images/products/p085.jpg" },
  { id: "p086", name: "Bột mì đa dụng", name_en: "All-purpose Flour", category: "gia-vi", unit: "kg", price: 30000, views: 312, sold: 267, image_url: "/images/products/p086.jpg" },
  { id: "p087", name: "Bột bắp (Maizena)", name_en: "Cornstarch (Maizena)", category: "gia-vi", unit: "gói 400g", price: 25000, views: 245, sold: 198, image_url: "/images/products/p087.jpg" },
  { id: "p088", name: "Ớt khô", name_en: "Dried Red Chili", category: "gia-vi", unit: "gói", price: 35000, views: 389, sold: 178, image_url: "/images/products/p088.jpg" },
  { id: "p089", name: "Quế thanh", name_en: "Cinnamon Sticks", category: "gia-vi", unit: "gói", price: 40000, views: 234, sold: 145, image_url: "/images/products/p089.jpg" },
  { id: "p090", name: "Hồi hoa", name_en: "Star Anise", category: "gia-vi", unit: "gói", price: 45000, views: 312, sold: 167, image_url: "/images/products/p090.jpg" },
  { id: "p091", name: "Sả khô", name_en: "Dried Lemongrass", category: "gia-vi", unit: "gói", price: 20000, views: 189, sold: 134, image_url: "/images/products/p091.jpg" },
  { id: "p092", name: "Gừng khô xay", name_en: "Ground Ginger", category: "gia-vi", unit: "hũ", price: 30000, views: 267, sold: 156, image_url: "/images/products/p092.jpg" },
  { id: "p093", name: "Nghệ bột", name_en: "Turmeric Powder", category: "gia-vi", unit: "hũ", price: 28000, views: 345, sold: 189, image_url: "/images/products/p093.jpg" },
  { id: "p094", name: "Nước mắm Phú Quốc", name_en: "Phu Quoc Premium Fish Sauce", category: "gia-vi", unit: "chai 500ml", price: 80000, views: 678, sold: 234, image_url: "/images/products/p094.jpg" },
  { id: "p095", name: "Tương đen Kecap Manis", name_en: "Sweet Dark Soy Sauce", category: "gia-vi", unit: "chai", price: 42000, views: 234, sold: 145, image_url: "/images/products/p095.jpg" },
  { id: "p096", name: "Súp miso Nhật", name_en: "Japanese Miso Paste", category: "gia-vi", unit: "hộp", price: 95000, views: 456, sold: 89, image_url: "/images/products/p096.jpg" },
  { id: "p097", name: "Dầu mè rang", name_en: "Toasted Sesame Oil", category: "gia-vi", unit: "chai", price: 65000, views: 389, sold: 178, image_url: "/images/products/p097.jpg" },
  { id: "p098", name: "Bột cà ri vàng", name_en: "Yellow Curry Powder", category: "gia-vi", unit: "hũ", price: 38000, views: 312, sold: 234, image_url: "/images/products/p098.jpg" },
  { id: "p099", name: "Bột ớt Hàn Quốc (Gochugaru)", name_en: "Korean Red Pepper Flakes", category: "gia-vi", unit: "gói", price: 75000, views: 445, sold: 123, image_url: "/images/products/p099.jpg" },
  { id: "p100", name: "Xốt oyster Lee Kum Kee", name_en: "Lee Kum Kee Oyster Sauce", category: "gia-vi", unit: "chai", price: 55000, views: 567, sold: 312, image_url: "/images/products/p100.jpg" },
];

async function seed() {
  console.log(`🚀 Seeding ${PRODUCTS.length} products to Supabase...`);
  
  // Upsert in batches of 20
  const batchSize = 20;
  let success = 0;
  
  for (let i = 0; i < PRODUCTS.length; i += batchSize) {
    const batch = PRODUCTS.slice(i, i + batchSize);
    const { error } = await supabase
      .from('products')
      .upsert(batch, { onConflict: 'id' });
    
    if (error) {
      console.error(`❌ Batch ${i/batchSize + 1} failed:`, error.message);
    } else {
      success += batch.length;
      console.log(`✅ Batch ${i/batchSize + 1}: inserted ${batch.length} products (total: ${success})`);
    }
  }
  
  console.log(`\n🎉 Done! ${success}/${PRODUCTS.length} products seeded to Supabase.`);
  console.log(`📊 View at: https://supabase.com/dashboard/project/yntgxollwjemyidizhnn/editor`);
}

seed().catch(console.error);
