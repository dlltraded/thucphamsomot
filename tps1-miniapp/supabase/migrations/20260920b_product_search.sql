-- ============================================================================
-- Migration: 20260920b_product_search.sql
-- Phase 1 — WP4: Tìm kiếm thông minh sản phẩm + danh mục nhanh + cột thumbnail
-- (Bản đã được Claude rà soát và sửa 2026-09-20: bỏ tạo bucket; sửa regex escape lỗi;
--  làm sạch từ khóa thay vì escape; similarity() không gắn schema.)
--
-- Additive: chỉ thêm cột/hàm/trigger/chỉ mục — không xóa/đổi dữ liệu sẵn có.
-- Ảnh dùng bucket "product-images" ĐÃ CÓ (public) — không tạo/đổi bucket ở đây.
-- ============================================================================

-- 1. Extension (Supabase đặt trong schema extensions)
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- 2. Hàm bỏ dấu IMMUTABLE (unaccent gốc là STABLE nên không dùng được trong trigger/index)
create or replace function public.immutable_unaccent(p_text text)
returns text
language sql
immutable
parallel safe
strict
set search_path = extensions, public
as $$
  select replace(replace(extensions.unaccent('extensions.unaccent', p_text), 'đ', 'd'), 'Đ', 'D');
$$;

-- 3. Cột mới
alter table public.products
  add column if not exists search_text text,
  add column if not exists search_text_plain text,
  add column if not exists thumb_url text,
  add column if not exists image_url_original text;

-- 4. Trigger: tự cập nhật search_text khi INSERT hoặc UPDATE name/sku/category/tags
--    (chuẩn hóa NFC để chữ có dấu gõ kiểu "tổ hợp" vẫn khớp; lower; gọn khoảng trắng)
create or replace function public.fn_products_search_text_update()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
declare
  v_combined text;
  v_tags_str text := '';
begin
  if new.tags is not null then
    v_tags_str := array_to_string(new.tags, ' ');
  end if;

  v_combined := lower(normalize(concat_ws(' ',
    coalesce(new.name, ''),
    coalesce(new.sku, ''),
    coalesce(new.category, ''),
    v_tags_str
  ), NFC));

  new.search_text := trim(regexp_replace(v_combined, '\s+', ' ', 'g'));
  new.search_text_plain := public.immutable_unaccent(new.search_text);
  return new;
end;
$$;

drop trigger if exists trg_products_search_text on public.products;
create trigger trg_products_search_text
  before insert or update of name, sku, category, tags
  on public.products
  for each row
  execute function public.fn_products_search_text_update();

-- 5. Backfill (chỉ dòng chưa có; trigger không kích hoạt vì không đổi name/sku/category/tags)
update public.products
set search_text = trim(regexp_replace(lower(normalize(concat_ws(' ',
      coalesce(name, ''), coalesce(sku, ''), coalesce(category, ''),
      coalesce(array_to_string(tags, ' '), '')
    ), NFC)), '\s+', ' ', 'g'))
where search_text is null;

update public.products
set search_text_plain = public.immutable_unaccent(search_text)
where search_text_plain is null and search_text is not null;

-- 6. Chỉ mục trigram (phục vụ nhánh fallback similarity; tìm theo từ dùng regex quét ~5k dòng, vẫn nhanh)
create index if not exists products_search_text_gin_trgm_idx
  on public.products using gin (search_text gin_trgm_ops);
create index if not exists products_search_text_plain_gin_trgm_idx
  on public.products using gin (search_text_plain gin_trgm_ops);

-- 7. Danh mục + số sản phẩm (thay cho việc kéo 5.295 dòng mỗi lần mở trang)
create or replace function public.get_distinct_categories()
returns table (category text, product_count bigint)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p.category, count(*) as product_count
  from public.products p
  where p.active = true
    and p.category is not null
    and trim(p.category) <> ''
  group by p.category
  order by p.category asc;
$$;
revoke all on function public.get_distinct_categories() from public;
grant execute on function public.get_distinct_categories() to service_role;

-- 8. RPC tìm kiếm
-- Quy tắc:
--  * Từ khóa được LÀM SẠCH: chuẩn hóa NFC, lower, mọi ký tự không phải chữ/số -> khoảng trắng.
--    Nhờ vậy không cần escape regex (không còn ký tự đặc biệt) và không có ký tự đại diện LIKE.
--  * Mọi từ phải khớp (AND); mỗi từ khớp ở ĐẦU từ (\y = ranh giới từ của Postgres; \b là backspace, KHÔNG dùng).
--  * Gõ CÓ dấu  -> khớp trên search_text (có dấu) trước; 0 kết quả mới nới sang không dấu.
--  * Gõ KHÔNG dấu -> khớp trên search_text_plain.
--  * 0 kết quả -> fallback similarity() > 0.3 (chịu lỗi gõ nhẹ).
--  * Xếp hạng: tên = cụm gõ > tên bắt đầu bằng cụm gõ > cả cụm là các từ liền nhau > similarity
--              giảm dần > có ảnh trước > tên A-Z.
--  * p_limit tối đa 60; p_query rỗng -> theo tên, có ảnh trước.
create or replace function public.search_products(
  p_query text default null,
  p_category text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  sku text,
  name text,
  category text,
  unit text,
  image_url text,
  thumb_url text,
  price_retail numeric,
  price_wholesale numeric,
  track_inventory boolean,
  stock_qty numeric,
  min_stock numeric,
  active boolean,
  total bigint
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_limit int;
  v_offset int;
  v_cat text;
  v_q text;            -- từ khóa đã làm sạch (có dấu, lower)
  v_plain text;        -- bản không dấu
  v_has_accents boolean;
  v_words text[];
  v_plain_words text[];
  v_found int;
begin
  v_limit  := least(greatest(coalesce(p_limit, 50), 1), 60);
  v_offset := greatest(coalesce(p_offset, 0), 0);
  v_cat    := nullif(trim(coalesce(p_category, '')), '');

  v_q := trim(regexp_replace(lower(normalize(coalesce(p_query, ''), NFC)), '[^[:alnum:]]+', ' ', 'g'));

  -- Rỗng (hoặc chỉ toàn ký tự đặc biệt): danh sách theo tên, có ảnh trước
  if v_q = '' then
    return query
    select p.id, p.sku, p.name, p.category, p.unit, p.image_url, p.thumb_url,
           p.price_retail, p.price_wholesale, p.track_inventory, p.stock_qty, p.min_stock,
           p.active, count(*) over() as total
    from public.products p
    where p.active = true
      and (v_cat is null or p.category = v_cat)
    order by
      case when coalesce(nullif(trim(p.thumb_url), ''), nullif(trim(p.image_url), '')) is not null then 0 else 1 end,
      p.name asc
    limit v_limit offset v_offset;
    return;
  end if;

  v_plain := public.immutable_unaccent(v_q);
  v_has_accents := (v_q <> v_plain);
  v_words := string_to_array(v_q, ' ');
  v_plain_words := string_to_array(v_plain, ' ');

  -- A) Gõ có dấu: khớp có dấu, đầu từ
  if v_has_accents then
    select count(*) into v_found
    from public.products p
    where p.active = true
      and (v_cat is null or p.category = v_cat)
      and not exists (
        select 1 from unnest(v_words) w
        where p.search_text !~ ('\y' || w)
      );

    if v_found > 0 then
      return query
      select p.id, p.sku, p.name, p.category, p.unit, p.image_url, p.thumb_url,
             p.price_retail, p.price_wholesale, p.track_inventory, p.stock_qty, p.min_stock,
             p.active, count(*) over() as total
      from public.products p
      where p.active = true
        and (v_cat is null or p.category = v_cat)
        and not exists (
          select 1 from unnest(v_words) w
          where p.search_text !~ ('\y' || w)
        )
      order by
        case when lower(p.name) = v_q then 0 else 1 end,
        case when lower(p.name) like (v_q || '%') then 0 else 1 end,
        case when p.search_text ~ ('\y' || v_q || '\y') then 0 else 1 end,
        similarity(p.search_text, v_q) desc,
        case when coalesce(nullif(trim(p.thumb_url), ''), nullif(trim(p.image_url), '')) is not null then 0 else 1 end,
        p.name asc
      limit v_limit offset v_offset;
      return;
    end if;
  end if;

  -- B) Gõ không dấu (hoặc gõ có dấu nhưng A) không ra gì): khớp không dấu, đầu từ
  select count(*) into v_found
  from public.products p
  where p.active = true
    and (v_cat is null or p.category = v_cat)
    and not exists (
      select 1 from unnest(v_plain_words) w
      where p.search_text_plain !~ ('\y' || w)
    );

  if v_found > 0 then
    return query
    select p.id, p.sku, p.name, p.category, p.unit, p.image_url, p.thumb_url,
           p.price_retail, p.price_wholesale, p.track_inventory, p.stock_qty, p.min_stock,
           p.active, count(*) over() as total
    from public.products p
    where p.active = true
      and (v_cat is null or p.category = v_cat)
      and not exists (
        select 1 from unnest(v_plain_words) w
        where p.search_text_plain !~ ('\y' || w)
      )
    order by
      case when public.immutable_unaccent(lower(p.name)) = v_plain then 0 else 1 end,
      case when public.immutable_unaccent(lower(p.name)) like (v_plain || '%') then 0 else 1 end,
      case when p.search_text_plain ~ ('\y' || v_plain || '\y') then 0 else 1 end,
      similarity(p.search_text_plain, v_plain) desc,
      case when coalesce(nullif(trim(p.thumb_url), ''), nullif(trim(p.image_url), '')) is not null then 0 else 1 end,
      p.name asc
    limit v_limit offset v_offset;
    return;
  end if;

  -- C) Fallback gần đúng (lỗi gõ nhẹ)
  return query
  select p.id, p.sku, p.name, p.category, p.unit, p.image_url, p.thumb_url,
         p.price_retail, p.price_wholesale, p.track_inventory, p.stock_qty, p.min_stock,
         p.active, count(*) over() as total
  from public.products p
  where p.active = true
    and (v_cat is null or p.category = v_cat)
    and similarity(p.search_text_plain, v_plain) > 0.3
  order by
    similarity(p.search_text_plain, v_plain) desc,
    case when coalesce(nullif(trim(p.thumb_url), ''), nullif(trim(p.image_url), '')) is not null then 0 else 1 end,
    p.name asc
  limit v_limit offset v_offset;
end;
$$;

revoke all on function public.search_products(text, text, int, int) from public;
grant execute on function public.search_products(text, text, int, int) to service_role;
