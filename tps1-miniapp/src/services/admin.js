import { supabase } from './supabase';

// Fetch ALL products (including inactive) for admin
export async function adminFetchProducts({ page = 1, pageSize = 20, search = '', category = '' } = {}) {
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .order('category')
    .order('name');

  if (search.trim()) {
    query = query.ilike('name', `%${search.trim()}%`);
  }
  if (category) {
    query = query.eq('category', category);
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { products: data || [], total: count || 0 };
}

// Update product fields
export async function adminUpdateProduct(id, fields) {
  const { data, error } = await supabase
    .from('products')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Toggle active status
export async function adminToggleActive(id, currentActive) {
  return adminUpdateProduct(id, { active: !currentActive });
}

// Upload image to Supabase Storage, returns public URL
export async function adminUploadImage(file, productId) {
  const ext = file.name.split('.').pop().toLowerCase();
  const fileName = `${productId}.${ext}`;

  // Try to delete existing first (ignore error)
  await supabase.storage.from('product-images').remove([fileName]);

  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: true,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

// Get distinct categories from products table
export async function adminFetchCategories() {
  const { data, error } = await supabase
    .from('products')
    .select('category');
  if (error) return [];
  return [...new Set(data.map((p) => p.category))].sort();
}
