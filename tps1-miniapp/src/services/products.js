import { supabase } from './supabase';
import { GENERATED_PRODUCTS } from '../data/products';

// Supabase category → app category ID mapping
const CAT_MAP = {
  'Rau củ quả':               'rau-cu',
  'Thịt heo':                 'thit-heo',
  'Thịt bò nhập khẩu':        'thit-bo',
  'Thịt gia cầm':             'ga-vit',
  'Thủy hải sản nhập khẩu':  'hai-san',
  'Đông lạnh - chế biến':     'dong-lanh',
  'Gia vị - nước chấm':       'gia-vi',
  'Gạo, mì, khô':             'gao-mi',
};

// Reverse map: app category ID → Supabase category name
export const CAT_REVERSE = Object.fromEntries(
  Object.entries(CAT_MAP).map(([k, v]) => [v, k])
);

// Fetch all active products from Supabase
export async function fetchProducts(categoryId = '') {
  try {
    let query = supabase
      .from('products')
      .select('id, local_product_id, name, category, sub_category, unit, price_wholesale, price_retail, active, tags, origin, pack_size, image_url')
      .eq('active', true)
      .order('category')
      .order('name');

    // Filter by category if provided
    if (categoryId && CAT_REVERSE[categoryId]) {
      query = query.eq('category', CAT_REVERSE[categoryId]);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data || data.length === 0) return GENERATED_PRODUCTS;

    // Map Supabase schema → app product format
    return data.map((p) => ({
      id: p.local_product_id || p.id,
      dbId: p.id,                              // Keep UUID for updates
      name: p.name,
      nameEn: p.name,                          // No EN name in Supabase yet
      category: CAT_MAP[p.category] || 'other',
      categoryRaw: p.category,
      subCategory: p.sub_category || '',
      unit: (p.unit || 'kg').toLowerCase(),
      price: p.price_wholesale || 0,           // B2B: show wholesale price
      priceRetail: p.price_retail || 0,
      packSize: p.pack_size || '',
      origin: p.origin || '',
      tags: p.tags || [],
      views: 0,
      sold: 0,
      // Image: ưu tiên Supabase Storage URL, fallback sang local file
      image: p.image_url || `./images/products/${p.local_product_id || p.id}.jpg`,
    }));
  } catch (err) {
    console.warn('Supabase fetch failed, using local data:', err.message);
    return GENERATED_PRODUCTS;
  }
}

// Search products by name
export async function searchProducts(term) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, local_product_id, name, category, unit, price_wholesale, active, image_url')
      .eq('active', true)
      .ilike('name', `%${term}%`)
      .limit(50);
    if (error) throw error;
    return (data || []).map((p) => ({
      id: p.local_product_id || p.id,
      dbId: p.id,
      name: p.name,
      nameEn: p.name,
      category: CAT_MAP[p.category] || 'other',
      unit: (p.unit || 'kg').toLowerCase(),
      price: p.price_wholesale || 0,
      image: p.image_url || `./images/products/${p.local_product_id || p.id}.jpg`,
    }));
  } catch {
    return [];
  }
}
