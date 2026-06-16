# TÀI LIỆU BÀN GIAO - ZALO MINI APP TPS1
## DỰ ÁN: Zalo Mini App — Thực Phẩm Số Một Đồng Nai

Tài liệu này dùng để bàn giao cho agent/developer khác tiếp quản Zalo Mini App TPS1.  
Cập nhật lần cuối: **12/06/2026**

---

## 1. Thông Tin Cần Nhớ Ngay

| Mục | Giá trị |
|---|---|
| **Đường dẫn project** | `d:\thuc_pham_so_mot\tps1-miniapp` |
| **Chạy local** | `npm run dev` → `http://localhost:3000` |
| **Tech stack** | React 18 + Vite 6 + Zustand + Axios |
| **Node version** | v24.14.1, npm 11.11.0 |
| **Repo chính** | `https://github.com/dlltraded-tps1/quanly.git` |
| **Google Sheets** | [Sheet Leads](https://docs.google.com/spreadsheets/d/100vzbwgIwaJrqtAOaknwMxxILTMiGEhuVt8QX7J2Dpo) — tab "Leads" |
| **Apps Script URL** | `https://script.google.com/macros/s/AKfycbwzSzAxX6tgXtVDt_U7PQFnXq5eupYTgBSEJ9VV7WOjY_I2tazX3wv-gYFOVLkxNSrW/exec` |
| **Website hiện tại** | [thucphamsomot.vn](https://thucphamsomot.vn) — Node.js, deploy Vercel |
| **Hotline** | 0972.792.139 (CEO: Nguyễn Tiến Bách) |

---

## 2. Bối Cảnh Dự Án

### Mục đích
Tạo **Zalo Mini App** (chạy trong ứng dụng Zalo) cho TPS1 để:
- Thêm **kênh thu lead thứ 2** (ngoài website)
- Khách mở Zalo → Chọn hàng → Gửi nhu cầu → Sales gọi lại → Chốt đơn
- Tự động lấy tên + SĐT từ tài khoản Zalo → giảm bước nhập liệu

### Mô hình kinh doanh
- **B2B thực phẩm sỉ** — KHÔNG phải bán lẻ
- Khách hàng: bếp ăn tập thể, nhà máy/KCN, trường học, bệnh viện, nhà hàng, khách sạn
- Luồng: Catalog → Yêu cầu báo giá → Sales chốt đơn (không có thanh toán online)

### Luồng dữ liệu

```
Zalo Mini App → POST JSON → Google Apps Script → Google Sheets (tab Leads)
                                                        ↓
                                            Backend Apps Script tự đọc
                                                        ↓
                                                   Supabase
                                                        ↓
                                                  Admin Web (quản lý)
```

> **Nguyên tắc:** Giữ nguyên luồng hiện tại của website. Mini App chỉ thêm 1 đầu vào mới, data đi cùng đường vào Google Sheets. Phân biệt bằng cột `source: "Zalo Mini App"` và `kenh: "zalo_miniapp"`.

---

## 3. Cấu Trúc Thư Mục

```
tps1-miniapp/
├── index.html                     # HTML entry point (mobile viewport, Inter font)
├── package.json                   # Dependencies
├── vite.config.js                 # Vite config (port 3000, alias @/)
├── node_modules/                  # 99 packages
└── src/
    ├── main.jsx                   # React entry → render <App />
    ├── App.jsx                    # BrowserRouter + Routes + ScrollToTop
    ├── css/
    │   └── app.css                # Design system đầy đủ (~600 dòng)
    ├── pages/
    │   ├── HomePage.jsx           # Trang chủ: banner + 3 CTA + categories + trust
    │   ├── RequestQuote.jsx       # Form báo giá: 12 trường, validate, submit
    │   ├── ProductCatalog.jsx     # Danh mục SP: search + filter + grid
    │   ├── OrderPage.jsx          # Đặt hàng nhanh: giỏ hàng + submit
    │   └── AboutPage.jsx          # Giới thiệu TPS1 (từ Profile PPTX)
    ├── components/
    │   ├── BottomNav.jsx          # Bottom tab navigation (4 tabs)
    │   ├── ProductCard.jsx        # Card sản phẩm (emoji + add to cart)
    │   └── SuccessModal.jsx       # Modal xác nhận gửi thành công
    ├── stores/
    │   ├── cart.js                # Zustand: giỏ hàng (add/remove/qty/clear)
    │   └── user.js                # Zustand: user info (tên/SĐT từ Zalo)
    ├── services/
    │   └── sheets.js              # POST lead → Apps Script + localStorage history
    └── utils/
        └── constants.js           # Config, API URL, categories, products, form options
```

---

## 4. Các Trang Đã Xây Dựng

### 4.1 Trang Chủ (`/`)
- Hero banner: logo + tên + slogan + hotline
- 3 CTA chính: Yêu cầu báo giá (primary), Xem sản phẩm, Đặt hàng nhanh
- Scroll ngang nhóm hàng (9 categories)
- Banner cam kết chất lượng
- 5 điểm "Tại sao chọn TPS1?"
- Footer liên hệ
- Floating cart badge (khi có SP trong giỏ)

### 4.2 Yêu Cầu Báo Giá (`/bao-gia`)
- Form 12 trường khớp 100% cột Google Sheets:

| Trường | Loại | Bắt buộc |
|---|---|---|
| Vai trò | Select (Người mua / Nhà cung cấp) | ✓ |
| Họ tên | Input (auto-fill từ Zalo) | ✓ |
| Số điện thoại | Input tel (auto-fill từ Zalo) | ✓ |
| Email | Input email | |
| Công ty / Đơn vị | Input | |
| Loại hình đơn vị | Select (8 options) | ✓ |
| Nhóm hàng quan tâm | Multi-checkbox (6 options) | |
| Quy mô nhu cầu | Select (5 options) | |
| Tần suất giao | Select (5 options) | |
| Khu vực giao hàng | Input | |
| Cần phản hồi trước | Date picker | |
| Mô tả nhu cầu | Textarea | |

- Validation: tên, SĐT (regex), loại hình
- Hiển thị sản phẩm đã chọn từ giỏ hàng (nếu có)
- Submit → POST Apps Script → Success modal → Redirect về trang chủ

### 4.3 Danh Mục Sản Phẩm (`/san-pham`)
- 30+ sản phẩm mẫu gộp thành 9 nhóm
- Search bar (lọc theo tên)
- Category chips (lọc theo nhóm)
- Product grid 2 cột
- Nút "Thêm vào yêu cầu" toggle
- Floating CTA "Gửi yêu cầu báo giá" khi có SP trong giỏ

### 4.4 Đặt Hàng Nhanh (`/dat-hang`)
- Quản lý giỏ hàng: +/- số lượng, xóa từng SP
- Nút "Thêm sản phẩm" → navigate sang catalog
- Form liên hệ: tên, SĐT, công ty, khu vực, ghi chú
- Submit → POST Apps Script (loại form: `dat_hang`)
- Empty state khi giỏ trống

### 4.5 Giới Thiệu TPS1 (`/gioi-thieu`)
- Thông tin lấy từ `Profile TPS1ĐN-2025.pptx`
- Stats: 2017 thành lập, 500+ SP, 100+ khách
- 5 cards: giới thiệu, sản phẩm, khách hàng mục tiêu, cam kết, dịch vụ cộng thêm
- Liên hệ CEO + hotline
- CTA báo giá

---

## 5. Tích Hợp Hiện Tại

### 5.1 Google Apps Script
- **URL:** xem mục 1 ở trên
- **Method:** POST với `Content-Type: text/plain` (tránh CORS preflight)
- **Fallback:** fetch với `mode: 'no-cors'` nếu axios fail
- **Payload:** JSON khớp format cột Google Sheets hiện tại
- **Phân biệt nguồn:** `kenh: "zalo_miniapp"` + `source: "Zalo Mini App"`

### 5.2 LocalStorage
- Key: `tps1_requests`
- Lưu lịch sử 50 yêu cầu gần nhất
- Dùng cho tính năng "Lịch sử yêu cầu" trong tương lai

### 5.3 Zalo SDK (CHƯA TÍCH HỢP)
- **Lý do:** Zalo SDK chỉ hoạt động trong môi trường Zalo thật, không chạy được trên browser thường
- **Cần làm khi deploy:** Xem mục 7 bên dưới

---

## 6. Design System

### Màu sắc
| Token | Giá trị | Dùng cho |
|---|---|---|
| `--color-primary` | `#1B7A3D` | Xanh lá — brand chính |
| `--color-primary-light` | `#2D9E52` | Hover, gradient |
| `--color-secondary` | `#E8920C` | Cam — accent, badge |
| `--color-accent` | `#E04D3D` | Đỏ — CTA nổi bật, error |
| `--color-bg` | `#F7FAF8` | Background page |
| `--color-text` | `#1A2B22` | Text chính |

### Typography
- Font: Inter (Google Fonts) → system fallback
- Sizes: 11px → 32px (xs → 3xl)

### Components trong CSS
- Hero banner, CTA cards, Category chips
- Form inputs/selects/textareas/checkboxes
- Product cards, Product grid
- Bottom navigation, Search bar
- Modal overlay, Toast notification
- Cart badge, Empty state, Loading spinner
- About cards, Contact footer, Info banner

---

## 7. Hướng Dẫn Deploy Lên Zalo

### Bước 0: Chuẩn bị (đã xong)
- [x] Tài khoản Zalo Developer
- [x] Zalo OA (Official Account)
- [x] Zalo App ID + Secret Key
- [x] Mini App ID

### Bước 1: Cài Zalo CLI + SDK
```bash
npm install -g zmp-cli
cd d:\thuc_pham_so_mot\tps1-miniapp
npm install zmp-sdk zmp-ui
```

### Bước 2: Tạo `app-config.json` ở thư mục gốc project
```json
{
  "app": {
    "title": "Thực Phẩm Số Một",
    "headerTitle": "TPS1 - Đặt Hàng",
    "headerColor": "#1B7A3D",
    "textColor": "white",
    "statusBar": "normal"
  },
  "pages": ["/bao-gia", "/san-pham", "/dat-hang", "/gioi-thieu"]
}
```

### Bước 3: Tích hợp Zalo SDK vào user store
Sửa file `src/stores/user.js` — thêm `getUserInfo()` và `getPhoneNumber()`:

```javascript
import { getUserInfo, getPhoneNumber } from "zmp-sdk/apis";

// Gọi khi app mount (trong App.jsx useEffect)
const fetchZaloUser = async () => {
  try {
    const { userInfo } = await getUserInfo({ autoRequestPermission: true });
    useUserStore.getState().setUserInfo(userInfo);
  } catch (e) {
    console.log('Không lấy được thông tin Zalo user:', e);
  }
};

// Gọi khi user bấm vào form (cần user đồng ý)
const fetchZaloPhone = async () => {
  try {
    const { token } = await getPhoneNumber();
    // Gửi token lên server để decode ra SĐT thật
    // (cần backend endpoint riêng)
  } catch (e) {
    console.log('User từ chối chia sẻ SĐT:', e);
  }
};
```

### Bước 4: Liên kết + Deploy
```bash
zmp login
zmp link --app-id YOUR_MINI_APP_ID
zmp deploy
```

### Bước 5: Gửi kiểm duyệt
- Vào [mini.zalo.me](https://mini.zalo.me) → Chọn app → Gửi kiểm duyệt
- Thời gian duyệt: 2-5 ngày làm việc

---

## 8. Danh Sách Việc Cần Làm Tiếp

### Ưu tiên cao (Phase 1b — trước khi launch)
1. [ ] Cài `zmp-sdk` + `zmp-ui` → tích hợp `getUserInfo()`, `getPhoneNumber()`
2. [ ] Tạo `app-config.json` cho Zalo platform
3. [ ] Test trên Zalo Mini App Studio (simulator)
4. [ ] Test trên điện thoại thật (Device Mode)
5. [ ] Deploy lên Zalo + gửi kiểm duyệt

### Ưu tiên trung bình (Phase 2 — sau khi launch)
6. [ ] Gửi notification qua Zalo OA khi có lead mới
7. [ ] Trang lịch sử yêu cầu (đọc từ localStorage)
8. [ ] Nút chat trực tiếp với Zalo OA
9. [ ] Product catalog từ Supabase (thay vì hardcode)
10. [ ] Tracking analytics trong Mini App

### Ưu tiên thấp (Phase 3 — tương lai)
11. [ ] Tích hợp ZaloPay thanh toán
12. [ ] Chương trình loyalty/tích điểm
13. [ ] QR Code scan sản phẩm
14. [ ] Re-order (đặt lại đơn cũ)
15. [ ] Push notification cho khách

---

## 9. Những Điểm Cần Lưu Ý Khi Tiếp Tục

1. **Không sửa format POST payload** trừ khi đồng thời sửa Apps Script và Google Sheets. Payload hiện tại khớp 100% cột Sheets.

2. **Cột phân biệt nguồn lead:**
   - `kenh: "zalo_miniapp"` (cột Kênh)
   - `source: "Zalo Mini App"` (cột Source)
   - Nếu đổi giá trị này, cần update filter trong Admin Web.

3. **CORS:** Apps Script chỉ nhận POST với `Content-Type: text/plain` hoặc `application/x-www-form-urlencoded`. Không dùng `application/json` vì sẽ bị CORS preflight.

4. **Zalo SDK chỉ chạy trong Zalo:** Không test được `getUserInfo()` / `getPhoneNumber()` trên browser thường. Dùng Zalo Mini App Studio hoặc Device Mode.

5. **Products hardcode:** Hiện đang dùng `SAMPLE_PRODUCTS` trong `constants.js` (30+ SP). Nếu muốn lấy từ Supabase, cần tạo service `supabase.js` riêng.

6. **Không có auth gate:** Mini App mở cho mọi người dùng Zalo. Không cần mã khóa như Admin Web.

7. **Mobile-only:** Max-width 480px. Luôn test trên viewport mobile.

---

## 10. Liên Quan Đến Hệ Thống Chính

| Hệ thống | Mối liên hệ |
|---|---|
| **Website** ([thucphamsomot.vn](https://thucphamsomot.vn)) | Cùng POST vào 1 Apps Script URL, cùng format Sheets |
| **Google Sheets** | Tab "Leads" — cùng cấu trúc cột |
| **Apps Script** | Cùng endpoint `/exec` — nhận cả website + mini app |
| **Backend** | Tự đọc Sheets → không cần sửa gì |
| **Supabase** | Chưa tích hợp trực tiếp (chỉ Admin dùng) |
| **Admin Web** (`d:\thuc_pham_so_mot\`) | Xem lead từ Zalo Mini App qua cột Source |
| **Profile PPTX** | Nội dung trang Giới thiệu lấy từ `Profile TPS1ĐN-2025.pptx` |

---

## 11. Commands Thường Dùng

```bash
# Chạy development
cd d:\thuc_pham_so_mot\tps1-miniapp
npm run dev

# Build production
npm run build

# Preview bản build
npm run preview

# Deploy lên Zalo (sau khi cài zmp-cli)
zmp deploy
```
