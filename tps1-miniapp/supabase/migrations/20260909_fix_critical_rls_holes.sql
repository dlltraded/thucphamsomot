-- FIX BAO MAT NGHIEM TRONG (phat hien va vá ngay 2026-09-09)
--
-- Phat hien: 2 policy RLS trong migration 20260824_admin_auth_rbac.sql duoc
-- tao "for all using (true)" nhung KHONG co menh de "to service_role" di kem:
--   create policy "service_role_all_vip_accounts" on public.vip_accounts for all using (true);
--   create policy "service_role_all_orders" on public.orders for all using (true);
--
-- Trong Postgres, mot policy khong chi dinh "to <role>" se ap dung cho TAT CA
-- cac role ket noi toi Postgres, bao gom ca "anon" (khoa cong khai nhung tro
-- thang trong bundle JS cua website/app, ai cung lay duoc) va "authenticated".
--
-- Hau qua thuc te: BAT KY AI cung co the dung anon key (public) de goi thang
-- REST API cua Supabase (vi du GET .../rest/v1/vip_accounts?select=*) va:
--   - Doc duoc password_hash, credit_limit, dia chi, SDT... cua TOAN BO khach hang
--     trong public.vip_accounts, va SUA/XOA tuy y (vi "for all" bao gom insert/update/delete).
--   - Doc/sua/xoa TOAN BO don hang trong public.orders.
-- Day la lo hong nghiem trong nhat duoc phat hien trong dot ra soat nay.
--
-- Vi sao chi can DROP ma khong can tao lai policy "for service_role":
-- Role "service_role" trong Supabase mac dinh co thuoc tinh BYPASSRLS, tuc la
-- service_role KHONG BAO GIO can policy de doc/ghi du lieu khi dung service-role
-- key (dung o toan bo API phia server trong app/api/**). Do do 2 policy nay
-- chua tung can thiet cho muc dich ban dau — chung chi co tac dung phu la mo
-- toang RLS cho anon/authenticated.
--
-- Sau khi DROP, nhan vien (admin/sale) van truy cap binh thuong nho cac policy
-- da co san trong cung migration 20260824 (admin_all_vip_accounts,
-- sale_own_vip_accounts, admin_all_orders, sale_own_orders) — cac policy nay
-- dua tren auth.uid() nen chi co tac dung khi client da dang nhap that qua
-- Supabase Auth (xem thay doi di kem o AuthContext.tsx / sale-auth/route.ts).

drop policy if exists "service_role_all_vip_accounts" on public.vip_accounts;
drop policy if exists "service_role_all_orders" on public.orders;

-- Thu hep policy doc admin_profiles: truoc day "using (true)" khong gioi han
-- role, nghia la ai cung doc duoc ten/email/SDT toan bo nhan vien qua anon key.
-- Gioi han lai chi cho role "authenticated" (nhan vien da dang nhap that).
-- Khong anh huong cac API phia server vi chung deu dung service-role (bypass RLS).
drop policy if exists "anyone_select_profiles" on public.admin_profiles;
create policy "authenticated_select_profiles" on public.admin_profiles
  for select to authenticated
  using (true);

-- Bo sung (khong lam mat quyen nao dang co): public.order_items va
-- public.order_history da bat RLS tu migration 20260812_central_orders.sql
-- nhung CHUA TUNG co bat ky policy nao -> mac dinh tu choi voi moi role
-- khong phai service_role, ke ca nhan vien da dang nhap that. Them policy
-- SELECT cho phep admin (toan quyen) hoac dung sale-rep duoc gan xem duoc
-- chi tiet mon hang / lich su cua nhung don ma ho von da duoc phep xem.
create policy "staff_select_order_items" on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (
          exists (select 1 from public.admin_profiles ap where ap.id = auth.uid() and ap.role = 'admin' and ap.is_active)
          or o.sales_rep_id = auth.uid()
        )
    )
  );

create policy "staff_select_order_history" on public.order_history
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_history.order_id
        and (
          exists (select 1 from public.admin_profiles ap where ap.id = auth.uid() and ap.role = 'admin' and ap.is_active)
          or o.sales_rep_id = auth.uid()
        )
    )
  );

-- ============================================================================
-- PHAT HIEN THU 2 (nghiem trong hon ca lo hong RLS o tren, va sau khi ra soat
-- toan bo cac file .sql trong repo -- ke ca nhung file KHONG nam trong thu muc
-- migrations chinh thuc, vi du quanly_webapp_migration.sql,
-- quanly_webapp_migration_2.sql -- ro rang la cac script duoc chay tay truc
-- tiep tren Supabase SQL Editor luc nao do, khong qua quy trinh migration):
-- RAT NHIEU ham RPC noi bo (khong chi ten bat dau "admin_") dang duoc goi
-- duoc boi role "anon" (khach vang lai, khong dang nhap):
--
--   - admin_reset_customer_password, admin_list_customers, admin_create_customer,
--     admin_update_customer, admin_toggle_customer_active, admin_update_tier_discount,
--     admin_create_order_full, admin_create_order (dinh nghia ham nay khong con
--     nam trong bat ky file .sql nao trong repo -- rat co the da duoc tao truc
--     tiep tren Supabase Dashboard, khong co trong source code -- nhung van bi
--     chan boi khoi quet nay vi khoi nay quet theo QUYEN HIEN TAI, khong theo
--     ten ham hay theo file nao tao ra no).
--   - sale_update_order (quanly_webapp_migration.sql): ham nay dang duoc goi
--     that trong app/api/sale/order/update/route.ts nhung qua service-role key
--     (khong bi anh huong boi REVOKE ben duoi) va da duoc gate boi cookie phien
--     dang nhap that o tang Next.js -- REVOKE quyen anon o day chi dong lai
--     duong goi thang qua REST API cua Supabase ma bo qua Next.js.
--   - sale_get_customers, sale_get_orders (quanly_webapp_migration_2.sql):
--     LOI THIET KE nghiem trong -- ham tin tuong hoan toan vao tham so p_role
--     do CLIENT tu khai bao ('admin' hay 'sale') de quyet dinh tra ve TOAN BO
--     khach hang / TOAN BO don hang hay chi mot phan, khong he kiem tra danh
--     tinh nguoi goi that su la ai. Khong con duoc goi o bat ky dau trong code
--     hien tai (da bi thay the), nhung van con ton tai that trong database va
--     goi duoc boi bat ky ai.
--   - create_vip_account (quanly_webapp_migration.sql): tao tai khoan VIP tuy
--     y (bao gom ca % chiet khau) ma khong can dang nhap. Khong con duoc goi
--     o bat ky dau trong code hien tai.
--
-- Vi cac file .sql ke tren khong dung chung 1 quy uoc dat ten (khong phai
-- lucn nao cung bat dau "admin_"), va vi co the con nhung ham tuong tu chua
-- phat hien duoc qua doc code (vi du duoc tao truc tiep tren Dashboard nhu
-- admin_create_order), cach an toan nhat KHONG PHAI la liet ke tung ham theo
-- ten, ma la: quet TOAN BO ham trong schema public dang THUC SU co quyen
-- EXECUTE cho role "anon" ngay bay gio (bat ke ai tao ra, tao bang cach nao),
-- roi thu hoi quyen do tru NHUNG HAM DA XAC MINH LA DANH CHO KHACH HANG va
-- an toan (co kiem tra p_session_token / mat khau that ben trong).
do $$
declare
  r record;
  v_customer_facing_whitelist text[] := array[
    'verify_customer_login',
    'customer_create_order',
    'customer_list_orders',
    'customer_change_password',
    'customer_confirm_draft_order',
    'register_customer_account'
  ];
begin
  for r in
    select p.oid::regprocedure as func_signature, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  loop
    if not (r.proname = any(v_customer_facing_whitelist)) then
      execute format('revoke execute on function %s from anon', r.func_signature);
    end if;
  end loop;
end $$;

-- Cac ham danh cho KHACH HANG trong danh sach whitelist o tren da duoc doc lai
-- tung ham va xac nhan: verify_customer_login/customer_change_password kiem
-- tra dung mat khau that (crypt/gen_salt) truoc khi cho lam gi; customer_create_order/
-- customer_list_orders/customer_confirm_draft_order deu doi hoi p_session_token
-- hop le (con han, khop dung customer) truoc khi tra/sua du lieu, va chi
-- tra/sua dung du lieu cua chinh customer_id gan voi token do; register_customer_account
-- la luong tu dang ky tai khoan moi, ban chat von danh cho nguoi chua dang nhap.

-- ============================================================================
-- PHAT HIEN THU 3: file supabase-schema.sql (schema goc ban dau, chay tay,
-- khong nam trong thu muc migrations) cap quyen bang GRANT o CAP DO BANG
-- (khong chi RLS policy) cho ca "anon" tren 3 bang:
--   grant select, insert, update, delete on table public.products to anon, authenticated;
--   grant select, insert, update, delete on table public.quotes to anon, authenticated;
--   grant select, insert, update, delete on table public.quote_history to anon, authenticated;
-- kem theo policy RLS "using (true)" khop voi tung quyen o tren. Hau qua:
--   - public.products: AI CUNG co the SUA/XOA truc tiep toan bo bang gia/ten/
--     ton kho cua san pham (vi du dat gia ve 0, hoac xoa sach danh muc hang)
--     ma khong can dang nhap -- nghiem trong vi day la du lieu GIA BAN dung
--     de tinh tien don hang.
--   - public.quotes / public.quote_history: AI CUNG doc/sua/xoa duoc toan bo
--     du lieu khach hang tiem nang (ten, SDT, cong ty, nhu cau) va lich su
--     bao gia -- lo PII va co the bi xoa sach toan bo pipeline CRM.
--
-- File nay CHUA TUNG bi anh huong boi cac ban vay o tren vi no khong dung ten
-- "admin_*" hay "anon-executable function", ma la GRANT + POLICY cap bang.
--
-- Fix: cho public.products GIU LAI quyen doc (select) cho anon vi khach hang
-- (website, Zalo Mini App) can xem danh muc/gia khi chua dang nhap -- chi
-- thu hoi quyen ghi (insert/update/delete). Cho quotes/quote_history: khong
-- tim thay bat ky luong khach vang lai hop le nao can truy cap Supabase truc
-- tiep (form "yeu cau bao gia" tren website di qua Google Sheet webhook rieng,
-- khong dung Supabase), nen thu hoi toan bo quyen cua anon tren 2 bang nay.

revoke insert, update, delete on public.products from anon;

revoke select, insert, update, delete on public.quotes from anon;
revoke select, insert, update, delete on public.quote_history from anon;

drop policy if exists "products_insert_all" on public.products;
create policy "authenticated_insert_products" on public.products
  for insert to authenticated
  with check (true);

drop policy if exists "products_update_all" on public.products;
create policy "authenticated_update_products" on public.products
  for update to authenticated
  using (true) with check (true);

drop policy if exists "products_delete_all" on public.products;
create policy "authenticated_delete_products" on public.products
  for delete to authenticated
  using (true);
-- products_select_all giu nguyen (khach hang can xem duoc danh muc/gia khi
-- chua dang nhap qua website va Zalo Mini App).

drop policy if exists "quotes_select_all" on public.quotes;
drop policy if exists "quotes_insert_all" on public.quotes;
drop policy if exists "quotes_update_all" on public.quotes;
drop policy if exists "quotes_delete_all" on public.quotes;
create policy "authenticated_all_quotes" on public.quotes
  for all to authenticated
  using (true) with check (true);

drop policy if exists "quote_history_select_all" on public.quote_history;
drop policy if exists "quote_history_insert_all" on public.quote_history;
drop policy if exists "quote_history_update_all" on public.quote_history;
drop policy if exists "quote_history_delete_all" on public.quote_history;
create policy "authenticated_all_quote_history" on public.quote_history
  for all to authenticated
  using (true) with check (true);

-- ============================================================================
-- PHAT HIEN THU 4: bang public.customer_contract_prices (gia hop dong rieng
-- theo tung khach hang, tao trong supabase-features-aug24.sql, chay tay,
-- khong nam trong thu muc migrations) co 2 policy khong gioi han role:
--   create policy select_contract_prices_all ... for select using (true);
--   create policy manage_contract_prices_all ... for all using (true);
-- Hau qua: AI CUNG doc duoc VA SUA duoc gia hop dong rieng cua tung khach
-- hang ma khong can dang nhap -- vua lo du lieu gia nhay cam, vua co the bi
-- loi dung de tao don voi gia bi sua sai (vi du sua gia hop dong ve gan 0
-- roi dat hang qua luong CUSTOM tier). Route khach hang tu xem gia hop dong
-- cua chinh minh (app/api/customer/contract-prices/route.ts) da dung
-- service-role key tu truoc, KHONG bi anh huong boi viec thu hoi quyen anon
-- o day.
drop policy if exists select_contract_prices_all on public.customer_contract_prices;
drop policy if exists manage_contract_prices_all on public.customer_contract_prices;
create policy "staff_all_contract_prices" on public.customer_contract_prices
  for all to authenticated
  using (
    exists (select 1 from public.admin_profiles ap where ap.id = auth.uid() and ap.role = 'admin' and ap.is_active)
    or exists (
      select 1 from public.vip_accounts v
      where v.id = customer_contract_prices.customer_id
        and v.sales_rep_id = auth.uid()
    )
  )
  with check (
    exists (select 1 from public.admin_profiles ap where ap.id = auth.uid() and ap.role = 'admin' and ap.is_active)
    or exists (
      select 1 from public.vip_accounts v
      where v.id = customer_contract_prices.customer_id
        and v.sales_rep_id = auth.uid()
    )
  );
-- Ghi chu: co mot cot "assigned_to" khac tren vip_accounts (tao trong
-- quanly_webapp_migration.sql, ham create_vip_account cu) co ve la ban nhap
-- truoc do cua cung y tuong "khach hang nay do ai phu trach" -- em CO Y
-- KHONG dung cot do o day vi khong chac chan no con duoc cap nhat song song
-- voi sales_rep_id hay khong (create_vip_account hien khong con duoc goi o
-- bat ky dau trong code). Neu sau nay phat hien mot so khach hang chi co
-- assigned_to ma khong co sales_rep_id, can dong bo lai 2 cot nay hoac sua
-- policy nay de kiem tra ca hai.
