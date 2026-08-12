# KẾ HOẠCH: Đăng nhập Khách Hàng VIP + Chiết Khấu Theo Nhóm — Zalo Mini App TPS1

Ngày lập: 2026-08-12. Trạng thái: **CHỜ DUYỆT — chưa code.**

## 1. Mục tiêu (theo chỉ thị chủ tịch, đã chốt qua trao đổi)

1. Ai trong công ty cũng gửi được cho khách 2 link: hồ sơ năng lực + Zalo Mini App (catalog + giá bán lẻ tham khảo).
2. Khách xem giá, thêm giỏ hàng thoải mái **không cần đăng nhập** — chỉ bị chặn ở bước **Thanh toán/Đặt hàng**.
3. Sale gọi lại hôm sau, nếu khách đồng ý → sale **tạo mã khách hàng + mật khẩu** trong Admin Web, gán nhóm **VIP1/VIP2/VIP3**.
4. Khách đăng nhập bằng **Mã khách hàng + Mật khẩu** (không dùng SĐT để tránh nhân viên nội bộ tự đặt hộ) → thấy thông tin tài khoản của mình → được phép thanh toán, giá tự động trừ theo **% chiết khấu của nhóm** (không set riêng từng khách — chỉnh % dùng chung theo nhóm).
5. Sale tạo/quản lý mã KH ngay trong **Admin Web hiện có** (`quanly/`), không xây trang quản trị riêng.

## 2. Tận dụng những gì đã có

- Bảng `vip_accounts` (Supabase) + UI `quanly/js/vip-accounts.js`: đã có `partner_code`, `name`, `phone`, `company`, `discount_tier` (A/B/C), `credit_limit`, `is_active`. **Sẽ mở rộng bảng này**, không tạo bảng mới song song.
- Mini app đã có Jotai state (`src/state.ts`), Supabase client (`src/utils/supabase.ts`), router (`src/router.tsx`), trang Profile (`src/pages/profile`), và `useCheckout()` (`src/hooks.ts`) — nơi gắn cổng chặn thanh toán.
- Admin Web (`quanly`) hiện dùng 1 mật khẩu chung cho toàn hệ thống (`SYSTEM_PASSWORD` trong `app.js`) để vào trang quản trị — không đổi, không liên quan tới auth khách hàng.

## 3. Vấn đề bảo mật cần xử lý (mấu chốt của yêu cầu "tránh bị phá")

Mini app và Admin Web đều là ứng dụng **client-side thuần**, dùng chung Supabase **anon key** — khóa này nằm ngay trong mã nguồn JS, ai cũng lấy được. Nếu để mật khẩu (dù đã hash) hay danh sách khách hàng có thể `SELECT *` trực tiếp qua anon key, coi như vô nghĩa.

→ **Giải pháp:** không cho anon key đọc/ghi trực tiếp bảng khách hàng. Toàn bộ thao tác (đăng nhập, tạo mã, đổi mật khẩu, liệt kê danh sách cho Admin) đi qua **Postgres RPC function** (`SECURITY DEFINER`) — hàm phía server trong Supabase tự kiểm tra mật khẩu bằng `pgcrypto` (`crypt()`), chỉ trả về đúng những trường an toàn, không bao giờ trả `password_hash` ra ngoài. Đây là cách làm chuẩn, không cần thêm backend server riêng, tận dụng đúng hạ tầng Supabase đang có.

## 4. Thay đổi Database (Supabase)

```sql
-- 4.1 Mở rộng bảng khách hàng VIP
alter table vip_accounts add column password_hash text;
alter table vip_accounts add column must_change_password boolean default false;
-- discount_tier: đổi giá trị cho phép từ A/B/C -> VIP1/VIP2/VIP3

-- 4.2 Bảng cấu hình % chiết khấu theo nhóm (sale chỉnh trong Admin, không sửa code)
create table customer_tiers (
  code text primary key,              -- 'VIP1' | 'VIP2' | 'VIP3'
  name text not null,
  discount_percent numeric not null default 0,
  updated_at timestamptz default now()
);
insert into customer_tiers (code, name, discount_percent) values
  ('VIP1', 'VIP1 - Khách thân thiết', 5),
  ('VIP2', 'VIP2 - Khách lớn',        10),
  ('VIP3', 'VIP3 - Đối tác chiến lược', 15);

-- 4.3 Khóa RLS: anon KHÔNG được select/insert/update trực tiếp vip_accounts
alter table vip_accounts enable row level security;
-- (không tạo policy nào cho anon => mặc định deny hết, chỉ RPC SECURITY DEFINER mới truy cập được)

create extension if not exists pgcrypto;

-- 4.4 RPC: khách đăng nhập
create or replace function verify_customer_login(p_code text, p_password text)
returns table(id uuid, code text, name text, phone text, company text,
              tier text, discount_percent numeric)
language plpgsql security definer as $$
begin
  return query
    select a.id, a.partner_code, a.name, a.phone, a.company, a.discount_tier,
           coalesce(t.discount_percent, 0)
    from vip_accounts a
    left join customer_tiers t on t.code = a.discount_tier
    where a.partner_code = upper(p_code)
      and a.is_active = true
      and a.password_hash is not null
      and a.password_hash = crypt(p_password, a.password_hash);
end; $$;
grant execute on function verify_customer_login to anon;

-- 4.5 RPC: sale tạo tài khoản (Admin gọi) - tự sinh + hash mật khẩu, trả mật khẩu plaintext DUY NHẤT 1 LẦN
create or replace function admin_create_customer(
  p_name text, p_phone text, p_company text, p_tier text
) returns table(partner_code text, password text)
language plpgsql security definer as $$
declare v_code text; v_pass text;
begin
  v_code := 'TPS1-' || upper(substr(md5(random()::text), 1, 4));
  v_pass := lpad(floor(random()*1000000)::text, 6, '0'); -- mật khẩu 6 số, dễ đọc qua điện thoại
  insert into vip_accounts (partner_code, name, phone, company, discount_tier, password_hash, is_active)
  values (v_code, p_name, p_phone, p_company, p_tier, crypt(v_pass, gen_salt('bf')), true);
  return query select v_code, v_pass;
end; $$;
grant execute on function admin_create_customer to anon;

-- 4.6 RPC: sale reset mật khẩu
create or replace function admin_reset_customer_password(p_code text)
returns text language plpgsql security definer as $$
declare v_pass text;
begin
  v_pass := lpad(floor(random()*1000000)::text, 6, '0');
  update vip_accounts set password_hash = crypt(v_pass, gen_salt('bf')), must_change_password = true
  where partner_code = upper(p_code);
  return v_pass;
end; $$;
grant execute on function admin_reset_customer_password to anon;

-- 4.7 RPC: Admin liệt kê danh sách khách hàng (không lộ password_hash)
create or replace function admin_list_customers()
returns table(id uuid, partner_code text, name text, phone text, company text,
              discount_tier text, is_active boolean, created_at timestamptz)
language sql security definer as $$
  select id, partner_code, name, phone, company, discount_tier, is_active, created_at
  from vip_accounts order by created_at desc;
$$;
grant execute on function admin_list_customers to anon;

-- customer_tiers: cho phép anon đọc (để hiện % công khai nếu cần), nhưng chỉ Admin mới sửa được -> cũng qua RPC riêng
```

> **Lưu ý đánh đổi đã thống nhất:** đây là mô hình "mật khẩu chặn ở cổng vào", không phải hệ thống auth JWT đầy đủ. Sau khi đăng nhập thành công, mini app lưu thông tin khách (id, mã, tên, nhóm, % chiết khấu) vào `localStorage` — giống hệt cách app đang lưu `shippingAddress`, `localOrders` hiện tại. Rủi ro còn lại: nếu ai đó tự sửa `localStorage` bằng DevTools trên máy họ, họ có thể tự nhận mình là khách VIP3 **trên chính điện thoại của họ** — không lộ mật khẩu hay dữ liệu người khác, không ảnh hưởng tới khách hàng thật. Nếu sau này cần chặt hơn (vd tổng đơn giá trị lớn), có thể nâng cấp thêm bước xác thực lại % chiết khấu ở phía server khi tạo đơn — để trong mục 7 "Nâng cấp sau".

## 5. Thay đổi Admin Web (`quanly/`)

- `quanly/js/vip-accounts.js`:
  - Đổi label hạng: A/B/C → **VIP1/VIP2/VIP3** (badge, dropdown).
  - Form tạo mới: bỏ nhập tay `partner_code`, gọi RPC `admin_create_customer` → nhận về `{partner_code, password}` → hiện modal "Đã tạo tài khoản: Mã ABCD1234 / Mật khẩu 583920 — gửi ngay cho khách, mật khẩu sẽ không hiển thị lại." + nút Copy.
  - Danh sách: gọi RPC `admin_list_customers` thay vì `sb.from('vip_accounts').select('*')`.
  - Thêm nút **"Reset mật khẩu"** mỗi dòng → gọi `admin_reset_customer_password` → hiện mật khẩu mới 1 lần.
  - Thêm tab con nhỏ **"Cấu hình % chiết khấu theo nhóm"**: 3 dòng VIP1/VIP2/VIP3, ô nhập %, nút Lưu (update `customer_tiers`, qua RPC admin riêng để tránh anon update trực tiếp — hoặc cho phép anon update `customer_tiers` vì bảng này không chứa PII, mức rủi ro thấp, có thể cân nhắc mở nhẹ RLS ở đây thay vì thêm RPC).

## 6. Thay đổi Zalo Mini App (`tps1-miniapp/`)

| File | Thay đổi |
|---|---|
| `src/state.ts` | Thêm `customerAuthState` (atomWithStorage, lưu `{id, code, name, phone, company, tier, discountPercent}` hoặc `null`). Sửa `cartTotalState` thêm `discountedTotal` dựa trên `discountPercent` nếu đã đăng nhập. |
| `src/pages/login/index.tsx` (trang mới) | Form 2 ô: Mã khách hàng, Mật khẩu. Submit → gọi `supabase.rpc('verify_customer_login', {p_code, p_password})`. Thành công → set `customerAuthState`, điều hướng theo `?redirect=`. Sai → toast lỗi, không tiết lộ sai ở trường nào. |
| `src/router.tsx` | Thêm route `/login`. |
| `src/hooks.ts` → `useCheckout()` | Đầu hàm: nếu `customerAuthState` rỗng → `navigate('/login?redirect=/cart')`, dừng lại (không gọi Zalo Pay). Nếu đã đăng nhập → dùng `discountedTotal` cho `paymentAmount`/`item.amount` thay vì giá gốc. |
| `src/pages/cart/*` (cart-summary, cart-item, cart-list) | Nếu đã đăng nhập: hiện giá gốc gạch ngang + giá đã chiết khấu + badge nhóm (VIP1/2/3). Nếu chưa đăng nhập: hiện banner nhỏ "Đăng nhập bằng mã khách hàng để nhận giá ưu đãi và đặt hàng" + nút "Đăng nhập". |
| `src/pages/profile/index.tsx` | Nếu đã đăng nhập bằng mã KH: hiện card thông tin (mã, tên, công ty, nhóm, % chiết khấu) + nút Đăng xuất, thay cho/thêm bên cạnh phần thông tin Zalo hiện có. |
| `src/pages/profile/editor.tsx` | Không đổi (đây là sửa userInfo Zalo, khác với customer account). |

## 7. Việc KHÔNG làm ở giai đoạn này (để sau nếu cần)

- Không xây JWT/session token có hạn dùng — dùng localStorage đơn giản như phần còn lại của app.
- Không cho override % riêng từng khách hàng (đã chốt: chỉ theo nhóm).
- Không đổi cơ chế mật khẩu Admin Web (`SYSTEM_PASSWORD`) — ngoài phạm vi yêu cầu.
- Không bắt buộc đổi mật khẩu lần đầu (`must_change_password` để sẵn cột, chưa bắt buộc luồng — có thể bật sau).

## 8. Thứ tự triển khai đề xuất

1. Chạy migration SQL (mục 4) trên Supabase — có thể làm trước, không ảnh hưởng hệ thống đang chạy vì bảng/cột mới, RLS chỉ khóa thêm bảng `vip_accounts` (cần kiểm tra Admin Web đang chạy hiện tại có phá vỡ do RLS mới không → sẽ sửa `vip-accounts.js` cùng lúc).
2. Sửa `quanly/js/vip-accounts.js` dùng RPC (mục 5), test tạo/list/reset mật khẩu trên Admin Web thật.
3. Thêm trang Login + state + gate checkout trong mini app (mục 6), test luồng: chưa đăng nhập → thêm giỏ → bấm đặt hàng → bị đẩy sang login → đăng nhập đúng mã/mật khẩu → quay lại giỏ → thấy giá đã chiết khấu → đặt hàng thành công.
4. Test luồng sai mật khẩu, tài khoản bị khóa (`is_active=false`), đăng xuất rồi vào lại.
5. Cập nhật `TAI_LIEU_BAN_GIAO.md` sau khi xong.

## 9. Chốt theo phản hồi (2026-08-12)

1. **Mật khẩu:** đổi từ "6 số ngẫu nhiên" sang **chuỗi 8 ký tự chữ+số** (bỏ ký tự dễ nhầm như `0/O`, `1/l/I`) làm mật khẩu tạm do hệ thống sinh. **Bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên** — dùng cột `must_change_password` đã có sẵn trong migration (mục 4.1), thêm màn hình "Đặt mật khẩu mới" chặn ngay sau khi xác thực mã tạm lần đầu, trước khi vào app.
2. **Đăng xuất:** có nút "Đăng xuất" trong Profile → xóa `customerAuthState` khỏi localStorage, quay lại chế độ khách vãng lai (giá bán lẻ, không chiết khấu) trên cùng máy.
3. **% chiết khấu khởi tạo:** giữ nguyên 5/10/15 làm giá trị mặc định trong migration — sale sẽ tinh chỉnh sau qua màn hình "Cấu hình % chiết khấu theo nhóm" trong Admin (mục 5), không cần đúng ngay từ đầu.
4. **Hiển thị % ngay sau đăng nhập:** thêm toast xác nhận kiểu "Đăng nhập thành công — Nhóm VIP2, chiết khấu 10%" ngay khi login xong, cộng với hiển thị thường trực trong Profile/Cart như đã thiết kế ở mục 6.
5. **Đồng bộ Website + Mini App (1 tài khoản dùng chung):** đã khảo sát `app/` của website — hiện là site marketing/SEO thuần, **chưa có hệ thống đăng nhập/quản lý đơn hàng khách hàng nào**. Đây là khối việc xây mới, không phải "nối dây" 2 hệ thống có sẵn. Đề xuất tách thành **Giai đoạn 2** riêng, sau khi Giai đoạn 1 (Mini App) chạy ổn:
   - Dùng chung bảng `vip_accounts` + các RPC đã tạo ở Giai đoạn 1 làm nguồn xác thực duy nhất (không tạo hệ thống tài khoản thứ 2).
   - Vì Website chạy Next.js có server thật (`app/api/*`), nên login ở đây làm được **an toàn hơn** Mini App: gọi RPC từ API route phía server (ẩn hoàn toàn logic xác thực khỏi trình duyệt), phát cookie phiên `httpOnly`.
   - Cần thêm: trang đăng nhập, trang "Đơn hàng của tôi" (đọc bảng `quotes` theo `customer_id`/phone), và đối chiếu lại luồng giỏ hàng hiện tại của website (`lib/cart-context.tsx`, `lib/quote-basket.ts`) xem có tương thích không.
   - Sẽ lên kế hoạch chi tiết riêng cho Giai đoạn 2 sau khi khảo sát kỹ `app/api`, `lib/cart-context.tsx` — không gộp vào scope code lần này để tránh trễ Giai đoạn 1.

## 10. Cập nhật thiết kế theo mục 9

- **Migration (mục 4):** đổi hàm sinh mật khẩu tạm trong `admin_create_customer` / `admin_reset_customer_password` từ 6 số sang chuỗi 8 ký tự chữ hoa+số (bảng ký tự loại trừ `0OIl1`), set `must_change_password = true` khi tạo mới hoặc reset.
- **Thêm RPC `customer_change_password(p_code, p_old_password, p_new_password)`:** xác thực mật khẩu cũ bằng `crypt()`, cập nhật `password_hash` mới + set `must_change_password = false`. Anon được `grant execute`.
- **Mini App:**
  - `src/pages/login/index.tsx`: sau khi `verify_customer_login` thành công, nếu `must_change_password = true` → điều hướng sang `src/pages/change-password/index.tsx` (trang mới) thay vì vào thẳng app; trang này gọi `customer_change_password`, xong mới set `customerAuthState` và cho vào app.
  - Toast ngay sau khi set `customerAuthState` thành công: `Đăng nhập thành công — Nhóm ${tier}, chiết khấu ${discountPercent}%`.
  - `src/pages/profile/index.tsx`: thêm nút "Đăng xuất" (xóa `customerAuthState`) và (tùy chọn) nút "Đổi mật khẩu" để khách tự đổi lại bất cứ lúc nào, không chỉ lần đầu — dùng chung `customer_change_password`.
