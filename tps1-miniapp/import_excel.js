const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yntgxollwjemyidizhnn.supabase.co';
const supabaseKey = 'sb_publishable_BhQX_aNaD5wzocEp7MXD_Q_DA4kOAZn';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Reading excel file...");
  const workbook = xlsx.readFile('d:\\\\thuc_pham_so_mot\\\\DanhSachSanPham_KV23062026-132405-026.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  console.log(`Found ${data.length} rows.`);

  const products = data.map(row => {
    let imageUrls = row['Hình ảnh (url1,url2...)'] || '';
    let firstImage = '';
    if (imageUrls) {
      const urls = imageUrls.split(',');
      if (urls.length > 0) firstImage = urls[0].trim();
    }

    return {
      local_product_id: row['Mã hàng'],
      sku: row['Mã hàng'],
      name: row['Tên hàng'],
      category: row['Nhóm hàng(3 Cấp)'] || 'Khác',
      price_wholesale: row['Giá bán'] || 0,
      price_retail: row['Giá vốn'] || 0,
      active: true,
      image_url: firstImage
    };
  }).filter(p => p.local_product_id && p.name);

  console.log(`Parsed ${products.length} valid products. Uploading to Supabase...`);

  const BATCH_SIZE = 50;
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    
    // Perform upsert based on local_product_id
    const { data: result, error } = await supabase
      .from('products')
      .upsert(batch, { onConflict: 'local_product_id' });

    if (error) {
      console.error(`Error uploading batch ${i/BATCH_SIZE}:`, error);
    } else {
      console.log(`Uploaded batch ${i/BATCH_SIZE + 1} (${batch.length} items)`);
    }
  }

  console.log("Upload complete!");
}

run();
