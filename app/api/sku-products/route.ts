import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Mapping: Supabase category name → slug
const CAT_MAP: Record<string, string> = {
  'Rau củ quả': 'rau-cu',
  'Thịt heo': 'thit-heo',
  'Thịt bò nhập khẩu': 'thit-bo',
  'Thịt gia cầm': 'ga-vit',
  'Thủy hải sản nhập khẩu': 'hai-san',
  'Đông lạnh - chế biến': 'dong-lanh',
  'Gia vị - nước chấm': 'gia-vi',
  'Gạo, mì, khô': 'gao-mi',
};

const CAT_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(CAT_MAP).map(([k, v]) => [v, k])
);

const CAT_IMAGE: Record<string, string> = {
  'rau-cu': '/images/tps1-vegetables.jpg',
  'thit-heo': '/images/tps1-meat-seafood.png',
  'thit-bo': '/images/tps1-meat-seafood.png',
  'ga-vit': '/images/tps1-meat-seafood.png',
  'hai-san': '/images/tps1-meat-seafood.png',
  'dong-lanh': '/images/tps1-frozen.png',
  'gia-vi': '/images/tps1-spices.png',
  'gao-mi': '/images/tps1-spices.png',
};

export interface SkuProduct {
  id: string;
  slug: string;
  name: string;
  category: string;      // slug: 'rau-cu'
  categoryLabel: string; // label: 'Rau củ quả'
  unit: string;
  price: number;
  image: string;
}

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || '';
  const q = searchParams.get('q') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const PAGE_SIZE = 60;
  const offset = (page - 1) * PAGE_SIZE;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Build query string for Supabase REST API
  const qs = new URLSearchParams({
    select: 'id,local_product_id,name,category,unit,price_wholesale,image_url',
    active: 'eq.true',
    order: 'category.asc,name.asc',
    limit: String(PAGE_SIZE),
    offset: String(offset),
  });

  if (category && CAT_REVERSE[category]) {
    qs.set('category', `eq.${CAT_REVERSE[category]}`);
  }

  if (q.trim()) {
    // Supabase ilike uses % wildcard
    qs.set('name', `ilike.*${q.trim()}*`);
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/products?${qs.toString()}`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      console.error('[sku-products] Supabase error:', res.status, txt.slice(0, 200));
      return NextResponse.json({ error: 'Fetch failed', details: txt }, { status: 503 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] = await res.json();

    const products: SkuProduct[] = raw.map((p) => {
      const catSlug = CAT_MAP[p.category] || 'other';
      const id = String(p.local_product_id || p.id);
      return {
        id,
        slug: id,
        name: p.name,
        category: catSlug,
        categoryLabel: p.category || '',
        unit: (p.unit || 'kg').toLowerCase(),
        price: Number(p.price_wholesale) || 0,
        image: p.image_url || CAT_IMAGE[catSlug] || '/images/tps1-cover-food.jpg',
      };
    });

    return NextResponse.json(products, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    console.error('[sku-products] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
