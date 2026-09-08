# TÀI LIỆU BÀN GIAO - ZALO MINI APP TPS1
## DỰ ÁN: Zalo Mini App — Thực Phẩm Số Một Đồng Nai

Tài liệu này dùng để bàn giao cho agent/developer khác tiếp quản Zalo Mini App TPS1.
Cập nhật lần cuối: **12/08/2026** (đã đối chiếu lại với source code thực tế trong `src/`).

> **Lưu ý:** Bản trước của tài liệu này (12/06/2026) mô tả một kiến trúc khác (pages `.jsx`
> như `RequestQuote`/`OrderPage`, Zustand, form báo giá gửi thẳng Google Sheets, sản phẩm
> hardcode, "Zalo SDK chưa tích hợp"). Đối chiếu với code hiện tại thì dự án đã được xây
> lại/phát triển tiếp trên nền template **ZaUI Market** (TypeScript) và đã tích hợp Zalo SDK
> + Supabase + Zalo Pay thật. Bản cập nhật này mô tả đúng những gì đang có trong `src/`.

---

## 1. Thông Tin Cần Nhớ Ngay

| Mục | Giá trị |
|---|---|
| **Đường dẫn project** | `d:\thuc_pham_so_mot\thuc_pham_so_mot\tps1-miniapp` |
| **Chạy local** | `npm run dev` (hoặc `npm start` chạy qua `zmp-cli`) → `http://localhost:3000` |
| **Tech stack** | React 18 + TypeScript + Vite 5 + Jotai (state) + `zmp-sdk`/`zmp-ui` (Zalo Mini App) + Supabase |
| **App ID (Zalo Mini App)** | `3486082144280639442` (xem `app-config.json`, `.env`) |
| **Supabase (products/quotes)** | `https://yntgxollwjemyidizhnn.supabase.co` (`VITE_SUPABASE_PRODUCTS_URL` / `VITE_SUPABASE_PRODUCTS_ANON_KEY` trong `.env`) |
| **Google Apps Script webhook** | `VITE_GOOGLE_SHEETS_WEBHOOK` trong `.env` — vẫn được gọi khi đặt hàng (xem mục 5.1) |
| **Website hiện tại** | [thucphamsomot.vn](https://thucphamsomot.vn) — dùng chung backend cho MAC thanh toán (`/api/payment/create-order-mac`) |
| **Hotline** | 0972.792.139 (CEO: Nguyễn Tiến Bách) |

---

## 2. Bối Cảnh Dự Án

### Mục đích
Zalo Mini App cho TPS1 để khách hàng B2B (bếp ăn tập thể, nhà máy/KCN, trường học, bệnh
viện, nhà hàng, khách sạn) có thể xem catalog, đặt hàng và theo dõi đơn ngay trong Zalo,
với thông tin tên/SĐT lấy tự động từ tài khoản Zalo (giảm bước nhập liệu).

### Mô hình kinh doanh
- B2B thực phẩm sỉ, không phải bán lẻ đại trà.
- Luồng hiện tại: Catalog (từ Supabase) → Thêm giỏ hàng → Chọn giao hàng/lấy tại điểm →
  Đặt hàng (COD qua Zalo Pay `createOrder`) → Đơn hàng đồng thời được ghi vào Google Sheets
  (qua Apps Script webhook) để đội sales theo dõi/liên hệ.

### Luồng dữ liệu thực tế

```
                         ┌─ Supabase (bảng "products") ──► Catalog / danh mục / trang chủ
Zalo Mini App ───────────┤
 (Jotai state.ts)        ├─ Supabase (bảng "quotes")   ──► Trang "Đơn hàng" (đọc theo lead_phone)
                         │
                         └─ Google Apps Script webhook  ──► Google Sheets (tab Leads)
                              (POST khi checkout, dùng để sales theo dõi song song)

Thanh toán: Mini App → gọi thucphamsomot.vn/api/payment/create-order-mac (lấy MAC)
                      → zmp-sdk createOrder() (Zalo Pay, COD) → success → /checkout-success
```

> Khác với mô tả cũ, **catalog và đơn hàng đọc trực tiếp từ Supabase**, không còn hardcode
> trong `constants.js`. Webhook Google Sheets **vẫn tồn tại** nhưng chỉ được gọi ở bước
> checkout (giỏ hàng), không có form "Yêu cầu báo giá" riêng như tài liệu cũ mô tả.

---

## 3. Cấu Trúc Thư Mục (thực tế)

```
tps1-miniapp/
├── index.html                 # HTML entry point
├── app-config.json            # Cấu hình Zalo Mini App (appId, header, template)
├── package.json                # Dependencies + scripts (dev/start/deploy/build:css)
├── vite.config.mts             # Vite config
├── zmp-cli.json                # Cấu hình Zalo Mini App CLI
├── .env                        # APP_ID, ZMP_TOKEN, Supabase keys, Google Sheets webhook
├── node_modules/
└── src/
    ├── app.ts                  # Entry: mount React root, load app-config.json vào window.APP_CONFIG
    ├── router.tsx               # createBrowserRouter — toàn bộ route của app
    ├── state.ts                 # Jotai atoms: user info (Zalo SDK), products/categories/orders (Supabase)
    ├── hooks.ts                  # useAddToCart, useCheckout (thanh toán + webhook), useRequestInformation...
    ├── config.ts                 # Các key localStorage
    ├── types.d.ts                # Type: Product, Category, Cart, Order, ShippingAddress, Station...
    ├── global.d.ts
    ├── css/
    │   ├── app.scss
    │   └── tailwind.scss
    ├── components/                # Component dùng chung: layout, header, footer, product-grid/item,
    │   │                           search-bar, category-slider, carousel, floating-cart-preview, ...
    ├── pages/
    │   ├── home/                  # Trang chủ: banners, category, flash-sales
    │   ├── catalog/                # category-list, category-detail, product-detail, related-products, share
    │   ├── cart/                   # index (giỏ hàng), cart-item/list/summary, delivery, stations,
    │   │                            shipping-address, apply-voucher, pay, payment-method
    │   ├── orders/                  # index (danh sách theo status), detail, order-item/list/summary
    │   ├── profile/                 # index, editor, user-info, follow-oa, barcode, points, register, actions
    │   ├── search/                   # tìm kiếm sản phẩm
    │   ├── shop-info/                 # thông tin cửa hàng
    │   └── checkout-success/           # trang thành công sau khi đặt hàng
    ├── mock/                        # JSON mẫu (banners, categories, orders, products, stations) —
    │   │                              dùng làm fallback qua utils/request.ts khi apiUrl trống, KHÔNG
    │   │                              phải nguồn dữ liệu chính (catalog thật lấy từ Supabase)
    ├── utils/
    │   ├── supabase.ts              # Khởi tạo Supabase client
    │   ├── request.ts                 # fetch tới apiUrl hoặc mock JSON (banners/stations)
    │   ├── template.ts                 # đọc app-config.json (window.APP_CONFIG)
    │   ├── zma.ts                       # getBasePath() cho router (deploy dạng /zapps/{APP_ID})
    │   ├── format.ts, location.ts
    └── static/                        # Ảnh danh mục, logo, illustration SVG
```

---

## 4. Các Trang Đã Xây Dựng (theo `router.tsx`)

| Route | Trang | Ghi chú |
|---|---|---|
| `/` | Trang chủ | Banner, danh mục, flash-sales — có logo + search bar |
| `/categories` | Danh sách danh mục | |
| `/category/:id` | Chi tiết danh mục | Có search bar, tiêu đề động theo tên category |
| `/product/:id` | Chi tiết sản phẩm | Có sản phẩm liên quan, share button |
| `/search` | Tìm kiếm sản phẩm | |
| `/cart` | Giỏ hàng | Danh sách item, tổng tiền, áp voucher |
| `/shipping-address` | Địa chỉ nhận hàng | |
| `/stations` | Điểm nhận hàng (tự đến lấy) | Tính khoảng cách qua `zmp-sdk` `getLocation` |
| `/orders/:status?` | Danh sách đơn hàng | Lọc theo trạng thái, đọc từ Supabase (`quotes`) + local order tạm |
| `/order/:id` | Chi tiết đơn hàng | |
| `/profile` | Trang cá nhân | Barcode, điểm thưởng (points), follow OA, chỉnh sửa hồ sơ |
| `/profile/edit` | Chỉnh sửa thông tin tài khoản | |
| `/shop-info` | Thông tin cửa hàng | |
| `/checkout-success` | Trang xác nhận đặt hàng thành công | |

Không còn các trang `RequestQuote`, `ProductCatalog`, `OrderPage`, `AboutPage`,
`BottomNav` riêng lẻ như mô tả trong bản tài liệu cũ — chức năng tương đương đã được
gộp/thay thế bởi cấu trúc catalog + cart + orders ở trên (theo layout chuẩn của ZaUI Market).

---

## 5. Tích Hợp Hiện Tại

### 5.1 Supabase (nguồn dữ liệu chính)
- **Bảng `products`**: đọc trực tiếp trong `src/state.ts` (`categoriesState`, `productsState`),
  lọc `active = true`, map `category` (text thô) sang nhóm hiển thị (`mapToSuperCategory`) —
  vd. "RAU CỦ QUẢ" → "Rau củ quả", "HẢI SẢN" → "Hải sản", v.v.
- **Bảng `quotes`**: đọc trong `ordersState` (theo `lead_phone` = SĐT user Zalo) để hiển thị
  đơn hàng, map trạng thái admin (`new/contacting/quoting/quoted/won/completed...`) sang
  `pending/shipping/completed` cho UI.
- Client khởi tạo tại `src/utils/supabase.ts`, dùng biến môi trường
  `VITE_SUPABASE_PRODUCTS_URL` / `VITE_SUPABASE_PRODUCTS_ANON_KEY`.

### 5.2 Google Apps Script Webhook (vẫn hoạt động song song)
- Gọi trong `useCheckout()` (`src/hooks.ts`) khi khách bấm đặt hàng — POST payload dạng
  `text/plain` chứa `kenh: "Zalo Mini App"`, `source: "Zalo Mini App"`, `loaiForm: "dat_hang"`,
  thông tin giao hàng, danh sách sản phẩm... vào Google Sheets (tab Leads) để đội sales theo dõi.
- URL lấy từ `VITE_GOOGLE_SHEETS_WEBHOOK` trong `.env`.
- Đây là kênh "báo cho sales biết", độc lập với Supabase — **không phải nguồn dữ liệu để
  hiển thị đơn hàng trong app** (đơn hàng hiển thị đọc từ Supabase `quotes`).

### 5.3 Thanh toán — Zalo Pay (ĐÃ tích hợp, khác với tài liệu cũ ghi "chưa")
- `useCheckout()` gọi `thucphamsomot.vn/api/payment/create-order-mac` để lấy MAC, sau đó
  gọi `createOrder()` của `zmp-sdk/apis` (COD qua Zalo Pay).
- Có nhiều lưu ý kỹ thuật quan trọng ghi thẳng trong code (`src/hooks.ts`):
  - `extradata` phải là chuỗi khác rỗng (vd `"{}"`), không được để `""`, nếu không SDK sẽ bỏ qua.
  - Tổng `item.amount` (đã làm tròn số nguyên) phải khớp chính xác `paymentAmount`, nếu không
    Zalo báo lỗi MAC.
  - `method` phải truyền dạng chuỗi JSON, không truyền object trực tiếp — nếu không chuỗi băm sẽ sai lệch.

### 5.4 Zalo SDK (ĐÃ tích hợp, khác với tài liệu cũ)
- `state.ts`: `userInfoState` gọi `getSetting`, `getUserInfo`, `getPhoneNumber` thật từ
  `zmp-sdk/apis` để lấy tên/avatar/SĐT người dùng (có fallback khi chạy trên browser dev —
  `isDev = !window.ZJSBridge`).
- **Lưu ý:** trong `phoneState` hiện đang có SĐT test hardcode `"0704104104"` sau khi lấy
  `token` từ `getPhoneNumber()` — cần thay bằng logic decode token thật (gọi backend) trước
  khi lên production, nếu chưa làm.
- `hooks.ts`: `useRequestInformation()` gọi `authorize()` xin quyền `scope.userInfo` +
  `scope.userPhonenumber` khi cần.
- `useCustomerSupport()`: mở chat với OA qua `openChat()` (cần set `template.oaIDtoOpenChat`
  trong `app-config.json`, hiện đang để trống).

### 5.5 LocalStorage
- Lưu `userInfo` (khi user tự sửa hồ sơ), `shippingAddress`, `delivery` mode, và
  `localOrders` — đơn hàng vừa đặt được hiển thị tạm ngay (trước khi kịp đồng bộ vào
  Supabase), tự ẩn sau 15 phút hoặc khi đã khớp với đơn thật trong Supabase.

---

## 6. Design System

- Theme màu cấu hình qua `app-config.json` (`headerColor: #1B7A3D`, `textColor: white`) và
  CSS variables trong `src/css/tailwind.scss` / `app.scss` — chỉnh theo hướng dẫn README gốc
  của ZaUI Market (`:root { --primary: ...; }`).
- UI kit: `zmp-ui` (component chuẩn Zalo Mini App) kết hợp Tailwind.

---

## 7. Hướng Dẫn Deploy Lên Zalo

### Đã có sẵn
- [x] `zmp-sdk` + `zmp-ui` đã cài và tích hợp thật (không còn ở bước "cần làm" như tài liệu cũ)
- [x] `app-config.json` đã có, `appId` đã điền
- [x] Thanh toán Zalo Pay đã nối dây

### Việc cần làm khi deploy
```bash
npm install -g zmp-cli
cd d:\thuc_pham_so_mot\thuc_pham_so_mot\tps1-miniapp
zmp login
zmp deploy
```
Sau đó vào [mini.zalo.me](https://mini.zalo.me) → chọn app → gửi kiểm duyệt (2-5 ngày làm việc).

Trước khi deploy, rà lại các điểm ở mục 9.

---

## 8. Danh Sách Việc Cần Làm Tiếp

### Ưu tiên cao (trước khi launch)
1. [ ] Thay SĐT hardcode `"0704104104"` trong `phoneState` (`src/state.ts`) bằng logic decode
       `token` thật từ `getPhoneNumber()` (cần backend endpoint riêng).
2. [ ] Set `template.oaIDtoOpenChat` trong `app-config.json` (hiện để trống) để nút chat OA
       (`useCustomerSupport`) hoạt động.
3. [ ] Test luồng thanh toán Zalo Pay thật trên Zalo Mini App Studio / Device Mode (MAC, amount
       khớp, COD).
4. [ ] Test trên điện thoại thật trước khi gửi kiểm duyệt.

### Ưu tiên trung bình
5. [ ] Rà soát mapping `mapToSuperCategory()` trong `state.ts` khi có category mới trong Supabase
       (hiện match theo chuỗi con tiếng Việt viết hoa, dễ bỏ sót nhóm mới).
6. [ ] Gửi notification qua Zalo OA khi có đơn hàng mới.
7. [ ] Trang điểm thưởng (`profile/points.tsx`) — kiểm tra đã nối dữ liệu thật chưa hay còn là UI mẫu.

### Ưu tiên thấp
8. [ ] Chương trình loyalty/tích điểm đầy đủ.
9. [ ] Re-order (đặt lại đơn cũ).
10. [ ] Push notification cho khách.

---

## 9. Những Điểm Cần Lưu Ý Khi Tiếp Tục

1. **Không sửa format payload gửi Google Sheets webhook** (`useCheckout` trong `src/hooks.ts`)
   trừ khi đồng thời sửa Apps Script + cấu trúc cột Sheets.
2. **Cột phân biệt nguồn lead:** `kenh: "Zalo Mini App"` + `source: "Zalo Mini App"` — đổi giá
   trị này cần update filter phía Admin Web.
3. **Nguồn dữ liệu catalog/đơn hàng là Supabase**, không phải Google Sheets hay hardcode —
   sửa dữ liệu sản phẩm phải sửa trong Supabase (bảng `products`), không sửa trong `mock/*.json`
   (mock chỉ là fallback cho `banners`/`stations` khi chưa cấu hình apiUrl).
4. **Thanh toán Zalo Pay có nhiều ràng buộc chặt** (MAC, amount phải khớp tuyệt đối, extradata
   không được rỗng) — xem comment chi tiết trong `useCheckout()` trước khi sửa.
5. **Zalo SDK chỉ chạy đầy đủ trong app Zalo thật:** `getUserInfo`/`getPhoneNumber`/`getLocation`
   cần Zalo Mini App Studio hoặc Device Mode để test thật; trên browser thường sẽ chạy theo
   nhánh `isDev` (dữ liệu giả định).
6. **Không có auth gate:** Mini App mở cho mọi người dùng Zalo.
7. **Deploy path:** `getBasePath()` (`src/utils/zma.ts`) tự thêm `/zapps/{APP_ID}` khi build
   production hoặc chạy ở môi trường TESTING/DEVELOPMENT qua query `env=`.

---

## 10. Liên Quan Đến Hệ Thống Chính

| Hệ thống | Mối liên hệ |
|---|---|
| **Website** ([thucphamsomot.vn](https://thucphamsomot.vn)) | Cung cấp endpoint `/api/payment/create-order-mac` cho Mini App dùng chung khi thanh toán |
| **Supabase** (`yntgxollwjemyidizhnn`) | Nguồn dữ liệu chính: bảng `products` (catalog) và `quotes` (đơn hàng) |
| **Google Sheets / Apps Script** | Vẫn nhận lead khi checkout, dùng cho sales theo dõi song song, KHÔNG phải nguồn hiển thị trong app |
| **Admin Web** (`d:\thuc_pham_so_mot\`) | Xem lead từ Zalo Mini App qua cột Source trong Sheets; quản lý `quotes` trong Supabase |

---

## 11. Commands Thường Dùng

```bash
# Chạy development
cd d:\thuc_pham_so_mot\thuc_pham_so_mot\tps1-miniapp
npm run dev

# Chạy qua Zalo CLI (mô phỏng môi trường Zalo)
npm start

# Build CSS Tailwind riêng (nếu cần)
npm run build:css

# Deploy lên Zalo (cần đã zmp login)
npm run deploy
```
