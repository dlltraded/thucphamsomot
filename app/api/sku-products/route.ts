import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_PRODUCTS_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_PRODUCTS_ANON_KEY || '';

// Mapping: UI slug → Supabase category `ilike` keyword
const CAT_REVERSE: Record<string, string> = {
  'rau-cu': 'RAU CỦ QUẢ',
  'thit-heo': 'THỊT HEO',
  'thit-bo': 'THỊT BÒ',
  'ga-vit': 'GIA CẦM',
  'hai-san': 'HẢI SẢN',
  'dong-lanh': 'ĐÔNG LẠNH',
  'gia-vi': 'GIA VỊ',
  'gao-mi': 'ĐỒ KHÔ',
  'thiet-bi-bep': 'CÔNG CỤ',
};

const CAT_IMAGE: Record<string, string> = {
  'rau-cu': '/images/tps1-vegetables.jpg',
  'thit-heo': '/images/tps1-meat-seafood.png',
  'thit-bo': '/images/tps1-meat-seafood.png',
  'ga-vit': '/images/tps1-meat-seafood.png',
  'hai-san': '/images/tps1-meat-seafood.png',
  'dong-lanh': '/images/tps1-frozen.png',
  'gia-vi': '/images/tps1-spices.png',
  'gao-mi': '/images/tps1-spices.png',
  'cong-cu': '/images/tps1_tools_placeholder.png',
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
    select: 'id,local_product_id,name,category,unit,price_retail,price_wholesale,image_url',
    active: 'eq.true',
    order: 'category.desc,name.asc',
    limit: String(PAGE_SIZE),
    offset: String(offset),
  });

  if (category && CAT_REVERSE[category]) {
    qs.set('category', `ilike.*${CAT_REVERSE[category]}*`);
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
          Prefer: 'count=exact',
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      console.error('[sku-products] Supabase error:', res.status, txt.slice(0, 200));
      return NextResponse.json({ error: 'Fetch failed', details: txt }, { status: 503 });
    }    const raw: any[] = await res.json();
    
    // Parse content-range for total count
    const contentRange = res.headers.get('content-range');
    let totalCount = 0;
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)/);
      if (match) totalCount = parseInt(match[1], 10);
    }

    const products: SkuProduct[] = raw.map((p) => {
      // Find matching slug for image
      let catSlug = 'other';
      for (const [slug, keyword] of Object.entries(CAT_REVERSE)) {
        if (p.category && p.category.includes(keyword)) {
          catSlug = slug;
          break;
        }
      }
      
      const id = String(p.local_product_id || p.id);
      return {
        id,
        slug: id,
        name: p.name,
        category: catSlug,
        categoryLabel: p.category || '',
        unit: (p.unit || 'kg').toLowerCase(),
        price: Number(p.price_retail) || Number(p.price_wholesale) || 0,
        image: p.image_url || CAT_IMAGE[catSlug] || '/images/tps1-cover-food.jpg',
      };
    });

    return NextResponse.json({
      products,
      totalCount,
      totalPages: Math.ceil(totalCount / PAGE_SIZE),
      page,
      pageSize: PAGE_SIZE,
    }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    console.error('[sku-products] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}



