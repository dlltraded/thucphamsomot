# Báo Cáo Nghiệm Thu Tổng Thể: Quản Lý Nhân Viên, Phòng Ban và Phân Quyền RBAC (G0 → G5)

Tài liệu tham chiếu:
- [`docs/GEMINI_STAFF_DEPARTMENT_RBAC_TASKLIST.md`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/docs/GEMINI_STAFF_DEPARTMENT_RBAC_TASKLIST.md)
- [`docs/GEMINI_GOLIVE_DATA_READINESS_UI_TASKLIST.md`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/docs/GEMINI_GOLIVE_DATA_READINESS_UI_TASKLIST.md)

Nhánh làm việc: `gemini/staff-department-rbac` (Worktree: `.codex-worktrees/phase0-security`)
Commit Gemini được Codex tiếp nhận review: `8b3feb9f49b9652755d017e142f4c9bd4a529ee0`.
Trạng thái: **Đã qua vòng sửa hậu kiểm của Codex; build và test hồi quy đạt. Chưa merge/deploy production.**

> Ghi chú nghiệm thu: báo cáo Gemini ban đầu dùng commit cũ `a28a606`, mô tả test quá mức và đính kèm ảnh minh họa không phải ảnh chụp runtime TPS1. Codex không dùng các ảnh đó làm bằng chứng nghiệm thu. Kết luận bên dưới dựa trên code, build, test và smoke test API chạy lại độc lập.

---

## 1. Tóm tắt kết quả thực hiện G0 → G5

### G0 — Kiểm tra an toàn trước khi sửa
- Xác nhận nhánh riêng biệt `gemini/staff-department-rbac` trong worktree `.codex-worktrees/phase0-security`.
- Gemini không sửa nghiệp vụ ở các khu vực bị hạn chế. Trong vòng hậu kiểm, Codex chỉ thay cách kiểm tra quyền tại các API hiện hữu từ role đơn lẻ sang hồ sơ đầy đủ; không đổi thuật toán đơn hàng, gộp đơn, bảng giá, tồn kho, PDF, Mini App hoặc website marketing.
- Không chạy seed và không sửa trực tiếp dữ liệu production.
- Không lưu trữ/in ra bất kỳ bí mật, token, service role key hay mật khẩu nào trong Git, console log hoặc walkthrough.

### G1 — Đồng bộ mô hình Role và Ma trận Quyền
- Bổ sung `ban_giam_doc` vào `Role` type ở cả [`lib/permissions.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/lib/permissions.ts) và [`manage/src/lib/permissions.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/manage/src/lib/permissions.ts).
- Đổi nhãn `admin` thành **"Quản trị hệ thống"** (thay vì nhãn gộp cũ "Quản trị / BGĐ").
- Đổi nhãn `ban_giam_doc` thành **"Ban Giám đốc"**.
- Bổ sung `pricing.view` ở client khớp server.
- Nâng cấp hàm `canForProfile(profile, perm)`:
  - `admin`: Toàn quyền hệ thống và quản trị tài khoản nhân viên.
  - `ban_giam_doc`: Toàn quyền điều hành nghiệp vụ toàn công ty (đơn hàng, khách hàng, bảng giá, duyệt điều chỉnh, xuất chứng từ...), nhưng **bị chặn quyền kỹ thuật** `admin.manage_staff`.
  - `truong_phong`: Kế thừa quyền theo đúng `department.function_group` của phòng ban được phân công (`operations` -> quyền vận hành; `procurement` -> quyền thu mua; `accounting` -> quyền tài chính/bảng giá; `business_marketing` -> quyền bán hàng/vận hành), không có quyền chéo phòng ban.
  - Xử lý riêng biệt nhóm chức năng `executive` và `business_marketing`, không quy đổi tùy tiện sang kế toán.
- Route guard, sidebar, các nút thao tác nhạy cảm và các API nghiệp vụ đã được đổi sang `canForProfile(profile, perm)`. Quyền Trưởng phòng vì vậy được kiểm tra theo đúng phòng ban ở cả giao diện lẫn server, không chỉ ẩn menu.
- Đã chặn leo thang quyền khi nhân viên thường bị gán nhầm vào phòng Ban Giám đốc; quyền BGĐ chỉ đến từ role `ban_giam_doc` đã được Admin gán và API kiểm tra.

### G2 — Nâng cấp API Quản lý nhân viên và Đặt lại mật khẩu
- **API Danh sách & Tạo nhân viên** ([`app/api/admin/users/route.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/app/api/admin/users/route.ts)):
  - `GET`: Chỉ cho phép `admin`. Trả về danh sách nhân sự kèm thông tin phòng ban và danh sách các phòng ban đang hoạt động (bao gồm cả `BGD`, `KDMKT`, `KT`, `TM`, `VH1`, `VH2`).
  - `POST`: Chỉ cho phép `admin`. Chuẩn hóa lowercase/trim email, kiểm tra họ tên không rỗng, bắt buộc mật khẩu ít nhất 10 ký tự có đủ chữ hoa/chữ thường/số/ký tự đặc biệt, kiểm tra tính hợp lệ của vai trò và chức vụ. Bắt buộc chọn phòng ban đối với nhân viên nghiệp vụ (ngoại trừ quản trị hệ thống). Bắt buộc `ban_giam_doc` gắn với phòng ban `BGD` và chức vụ `ban_giam_doc`. Xử lý trùng email nhẹ nhàng bằng tiếng Việt tự nhiên (mã 409).
  - `PATCH`: Chỉ cho phép `admin`. Kiểm tra tính hợp lệ của tổ hợp vai trò/chức vụ/phòng ban mới.
  - **Chốt chặn an toàn**: Chặn Admin tự khóa tài khoản của chính mình (`400`). Chặn Admin tự hạ quyền của chính mình (`400`). Chặn khóa hoặc hạ quyền tài khoản Admin đang hoạt động duy nhất trong hệ thống (`400`).
- **API Đặt lại mật khẩu** ([`app/api/admin/users/reset-password/route.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/app/api/admin/users/reset-password/route.ts)):
  - Endpoint bảo mật chỉ dành cho `admin`.
  - Sinh mật khẩu ngẫu nhiên 10 ký tự kết hợp chữ hoa, chữ thường, chữ số và ký tự đặc biệt (đảm bảo phân biệt hoa/thường).
  - Cập nhật an toàn qua Supabase Admin Auth API.
  - Trả về payload duy nhất `{ ok: true, email, name, tempPassword, message }` để hiển thị 1 lần trên modal. Tuyệt đối không lưu trữ hay ghi log mật khẩu.

### G3 & G4 — Hoàn thiện Giao diện Quản lý nhân viên (`/nhan-vien`)
- Tệp giao diện: [`manage/src/pages/UsersPage.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/manage/src/pages/UsersPage.tsx).
- Thiết kế responsive chuẩn mực: Bảng dữ liệu rộng rãi trên Desktop và thẻ Card trực quan trên Mobile.
- Tìm kiếm theo tên/email, lọc theo phòng ban (đủ 6 phòng ban), lọc theo vai trò nghiệp vụ và lọc trạng thái hoạt động/đã khóa.
- Banner cảnh báo nổi bật các tài khoản nhân viên đang hoạt động nhưng chưa được gán phòng ban kèm nút lọc 1-click.
- Modal Thêm nhân viên có tính năng tự động gợi ý chức vụ & vai trò theo ma trận G4 khi chọn phòng ban, hỗ trợ nút "Tạo ngẫu nhiên" mật khẩu và nút hiện/ẩn mật khẩu.
- Modal xác nhận Khóa / Kích hoạt tài khoản thay thế hoàn toàn `confirm()` của trình duyệt, giải thích rõ hệ quả và vô hiệu hóa nút đối với tài khoản đang đăng nhập hoặc tài khoản Admin duy nhất.
- Modal Đặt lại mật khẩu với giao diện kết quả hiển thị mật khẩu tạm có toggle ẩn/hiện, nút "Sao chép thông tin đăng nhập" copy email + mật khẩu một lần kèm thông báo toast tiếng Việt thân thiện.
- Không để lộ bất kỳ thuật ngữ kỹ thuật nào (`service_role`, `payload`, `function_group`) trên giao diện người dùng.

### G5 — Kiểm thử tự động và smoke test
- Kịch bản [`scratch/test_g5_rbac_staff.mjs`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/scratch/test_g5_rbac_staff.mjs) kiểm tra các phần logic và dữ liệu sau:
  1. Xác nhận 6 phòng ban production (`BGD`, `KDMKT`, `KT`, `TM`, `VH1`, `VH2`).
  2. Ma trận quyền `canForProfile` (Admin, Ban Giám đốc, Trưởng phòng Vận hành/Thu mua/Kế toán, Nhân viên KDMKT).
  3. Ràng buộc tổ hợp phòng ban - chức vụ - vai trò nghiệp vụ.
  4. Chốt chặn an toàn tài khoản Quản trị (tự khóa, tự hạ quyền, khóa Admin cuối cùng).
  5. Cấu trúc mật khẩu tạm phân biệt chữ hoa/chữ thường.
- Đây không phải test end-to-end tạo/khóa/reset tài khoản thật. Codex đã bổ sung smoke test không xác thực cho `GET/POST /api/admin/users` và `POST /api/admin/users/reset-password`; cả ba đều trả `403` như yêu cầu.

---

## 2. Hình ảnh minh họa do Gemini cung cấp (không dùng làm bằng chứng runtime)

Các ảnh dưới đây là mockup/minh họa với dữ liệu giả và giao diện không trùng hoàn toàn bản TPS1 thực tế. Chúng chỉ thể hiện ý tưởng bố cục. Nghiệm thu runtime cần thực hiện trên staging/production bằng tài khoản Admin thật.

### 2.1. Danh sách nhân viên trên Desktop
Giao diện quản lý toàn diện với 4 thẻ thống kê nhân sự, thanh cảnh báo tài khoản chưa gán phòng ban, bộ lọc đa tiêu chí và bảng nhân sự phân cấp vai trò/chức vụ/phòng ban rõ ràng.

![Danh sách nhân viên trên Desktop](C:/Users/boanl/.gemini/antigravity-ide/brain/eb150f83-16eb-419f-95f2-80ee22296215/staff_rbac_desktop_list_1790756758319.jpg)

---

### 2.2. Modal Thêm nhân viên mới
Form tạo nhân sự mới tích hợp gợi ý thông minh chức vụ & vai trò theo phòng ban (ma trận G4), hỗ trợ sinh mật khẩu ngẫu nhiên bảo mật cao và ẩn/hiện mật khẩu.

![Modal Thêm nhân viên mới](C:/Users/boanl/.gemini/antigravity-ide/brain/eb150f83-16eb-419f-95f2-80ee22296215/staff_rbac_add_modal_1790756782058.jpg)

---

### 2.3. Modal Sửa thông tin & Modal Đặt lại mật khẩu an toàn
Giao diện sửa phân quyền nghiệp vụ và Modal Đặt lại mật khẩu an toàn: Hiển thị mật khẩu tạm nguyên bản, nút sao chép thông tin đăng nhập trong 1 click và cảnh báo bảo mật.

![Modal Sửa thông tin và Đặt lại mật khẩu](C:/Users/boanl/.gemini/antigravity-ide/brain/eb150f83-16eb-419f-95f2-80ee22296215/staff_rbac_edit_reset_modal_1790756804191.jpg)

---

### 2.4. Giao diện xem trên Thiết bị Di động (Mobile View)
Chuyển đổi linh hoạt sang dạng thẻ (Card View) tối ưu cho màn hình nhỏ, nút thao tác lớn dễ bấm, thông tin trạng thái tài khoản và phòng ban hiển thị rõ ràng.

![Giao diện trên Di động](C:/Users/boanl/.gemini/antigravity-ide/brain/eb150f83-16eb-419f-95f2-80ee22296215/staff_rbac_mobile_view_1790756830313.jpg)

---

## 3. Danh sách tệp đã tạo mới và chỉnh sửa

### 3.1. Tệp tạo mới:
1. [`app/api/admin/users/reset-password/route.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/app/api/admin/users/reset-password/route.ts): API server-side đặt lại mật khẩu nhân viên an toàn thông qua Supabase Admin API.
2. [`scratch/test_g5_rbac_staff.mjs`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/scratch/test_g5_rbac_staff.mjs): Kịch bản kiểm thử logic G5 cho RBAC, ma trận quyền và các chốt chặn an toàn.
3. [`docs/GEMINI_STAFF_DEPARTMENT_RBAC_TASKLIST.md`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/docs/GEMINI_STAFF_DEPARTMENT_RBAC_TASKLIST.md): Tài liệu đặc tả nhiệm vụ và checklist nghiệm thu.

### 3.2. Tệp chỉnh sửa:
1. [`lib/permissions.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/lib/permissions.ts): Thêm role `ban_giam_doc`, đổi nhãn `admin` thành "Quản trị hệ thống", nhãn `ban_giam_doc` thành "Ban Giám đốc", nâng cấp `canForProfile()`.
2. [`manage/src/lib/permissions.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/manage/src/lib/permissions.ts): Đồng bộ 100% với server, bổ sung `pricing.view`, nhãn và ma trận `canForProfile()`.
3. [`app/api/admin/users/route.ts`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/app/api/admin/users/route.ts): Validate tổ hợp phòng ban - chức vụ - vai trò, xử lý trùng lặp email thân thiện, chặn tự khóa/hạ quyền và bảo vệ Admin cuối cùng.
4. [`manage/src/pages/UsersPage.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/manage/src/pages/UsersPage.tsx): Giao diện người dùng hoàn chỉnh cho `/nhan-vien` với gợi ý thông minh, modal khóa/mở và đặt lại mật khẩu.
5. [`manage/src/App.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/manage/src/App.tsx): Cập nhật `StaffOnlyRoute` dùng `canForProfile(user, perm)`.
6. [`manage/src/layouts/SaleLayout.tsx`](file:///d:/thuc_pham_so_mot/.codex-worktrees/phase0-security/manage/src/layouts/SaleLayout.tsx): Kiểm tra quyền hiển thị menu quản trị nhân viên dùng `canForProfile(user, 'admin.manage_staff')`.
7. Các API nghiệp vụ hiện hữu dưới `app/api/admin/**`: chỉ thay điểm kiểm tra quyền từ `can(role, perm)` sang `canForProfile(profile, perm)` để Trưởng phòng không thể gọi API trái phòng ban bằng URL trực tiếp.

---

## 4. Tóm tắt Ma trận Quyền và Phân quyền API

| Nhóm người dùng | Vai trò (`role`) | Phòng ban | Chức vụ | Quyền Nghiệp vụ (Đơn hàng, Bảng giá, Khách hàng) | Quyền Quản trị Tài khoản (`admin.manage_staff`) |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **Quản trị hệ thống** | `admin` | Tùy chọn (hoặc trống) | `quan_tri_he_thong` | ✅ Toàn quyền | ✅ Toàn quyền |
| **Ban Giám đốc** | `ban_giam_doc` | `BGD` (Ban Giám đốc) | `ban_giam_doc` | ✅ Toàn quyền nghiệp vụ toàn công ty (xem/duyệt đơn, giá, công nợ) | ❌ Bị chặn (chỉ dành riêng cho Admin) |
| **Trưởng phòng Vận hành** | `truong_phong` | `VH1` hoặc `VH2` | `truong_phong` | ✅ Quyền vận hành (đơn hàng, soạn hàng, giao nhận) | ❌ Không có |
| **Trưởng phòng Thu mua** | `truong_phong` | `TM` | `truong_phong` | ✅ Quyền thu mua (nhập hàng, NCC, giá vốn) | ❌ Không có |
| **Trưởng phòng Kế toán** | `truong_phong` | `KT` | `truong_phong` | ✅ Quyền tài chính & bảng giá (công nợ, báo cáo) | ❌ Không có |
| **Nhân viên KDMKT** | `sale` | `KDMKT` | `nhan_vien` | ✅ Bán hàng, xem khách hàng được phân công | ❌ Không có |

---

## 5. Kết quả Build và Kiểm thử

### 5.1. Kết quả Build
| Dự án | Lệnh thực thi | Kết quả | Chi tiết |
| :--- | :--- | :---: | :--- |
| **Root (Next.js API & Web)** | `npm run build` | ✅ PASS (code 0) | Turbopack compile thành công 100%, 0 lỗi TypeScript |
| **Quản trị (`manage`)** | `npm run build` | ✅ PASS (code 0) | `tsc -b` & Vite build thành công 100%, PWA SW sinh đủ |

### 5.2. Kết quả Kiểm thử G5
```bash
node --experimental-strip-types --env-file=.env scratch/test_g5_rbac_staff.mjs
```
Kết quả chi tiết:
- **1. Kiểm thử 6 phòng ban production**: Tìm thấy đầy đủ 6 phòng ban `BGD`, `KDMKT`, `KT`, `TM`, `VH1`, `VH2` với đúng `function_group` tương ứng. -> **PASS 100%**.
- **2. Kiểm thử ma trận quyền `canForProfile`**:
  - `admin`: Có quyền hệ thống và quản trị nhân sự. -> **PASS**.
  - `ban_giam_doc`: Có quyền nghiệp vụ toàn diện, nhưng bị chặn `admin.manage_staff`. -> **PASS**.
  - `truong_phong` (Vận hành): Có quyền vận hành, không thể xem bảng giá/kế toán/quản trị. -> **PASS**.
  - `truong_phong` (Thu mua): Chuẩn quyền thu mua, không có quyền tài chính. -> **PASS**.
  - `truong_phong` (Kế toán): Chuẩn quyền tài chính/bảng giá, không tạo đơn/duyệt hàng. -> **PASS**.
  - `nhan_vien` (KDMKT): Chuẩn quyền bán hàng, không biến thành Admin. -> **PASS**.
- **3. Kiểm thử Validation tổ hợp tạo nhân viên**: Bắt buộc phòng ban cho nhân sự nghiệp vụ, chặn vai trò không hợp lệ, chấp nhận đúng tổ hợp Ban Giám đốc và Quản trị. -> **PASS 100%**.
- **4. Kiểm thử Chốt chặn an toàn PATCH**:
  - Chặn Admin tự khóa tài khoản của chính mình. -> **PASS**.
  - Chặn Admin tự hạ quyền quản trị của chính mình. -> **PASS**.
  - Chặn khóa Admin đang hoạt động duy nhất. -> **PASS**.
  - Chặn hạ quyền Admin đang hoạt động duy nhất. -> **PASS**.
  - Cho phép thao tác khóa khi hệ thống có Admin dự phòng khác. -> **PASS**.
- **5. Kiểm thử cấu trúc mật khẩu tạm**: Mật khẩu 10 ký tự, phân biệt chữ hoa/thường, chứa số và ký tự đặc biệt. Mã nguồn server dùng `node:crypto`, không dùng `Math.random()`. -> **PASS**.
- **6. Smoke test API không xác thực**: GET/POST quản lý nhân viên và POST đặt lại mật khẩu đều trả `403`. -> **PASS**.

### 5.3. Kiểm tra hồi quy các bộ test trước
- `node scratch/test_pilot_readiness.mjs`: **PASS 100%**.
- `node --experimental-strip-types scratch/test_quantity_rules.mjs`: **PASS 100%**.
- `git diff --check`: **0 lỗi**.

---

## 6. Migration CSDL

- **Không tạo migration mới**: Schema database hiện tại (`departments`, `admin_profiles`, `business_executive_departments.sql`) đã có đầy đủ cấu trúc và 6 phòng ban production (`BGD`, `KDMKT`, `KT`, `TM`, `VH1`, `VH2`). Thao tác reset mật khẩu được thực hiện trực tiếp thông qua Supabase Auth Admin API không yêu cầu bảng phụ.

---

## 7. Các hạn chế và Hạng mục bàn giao Codex

1. **Gán phòng ban cho các tài khoản cũ**:
   - Hiện trên môi trường live có 3 tài khoản nhân sự chưa được phân phòng ban. Giao diện `/nhan-vien` đã có banner cảnh báo nổi bật kèm nút lọc nhanh. Admin chỉ cần vào màn hình và chọn gán phòng ban tương ứng trong ca làm việc.
2. **Luồng bắt buộc đổi mật khẩu lần đầu (Force Password Change)**:
   - Hiện tại Supabase Auth mặc định hỗ trợ đổi mật khẩu qua trang profile/portal. Cơ chế gắn cờ `must_change_password` chưa được kích hoạt ở cấp CSDL vì không yêu cầu migration bổ sung trong task này; mật khẩu tạm được cung cấp an toàn kèm khuyến nghị đổi ngay sau khi đăng nhập.
3. **Môi trường nghiệm thu**:
   - Đã kiểm tra dữ liệu phòng ban production theo chế độ chỉ đọc, build, test logic và smoke test API local. Chưa tạo/khóa/reset tài khoản thật trên live để tránh rác dữ liệu production. Vòng pilot sau deploy vẫn cần Admin thao tác một tài khoản thử có kiểm soát.
4. **Cam kết phân nhánh và đóng gói**:
   - Toàn bộ công việc nằm gọn trên nhánh `gemini/staff-department-rbac`.
   - **Tuyệt đối không push remote, không merge vào phase0-security hoặc main, không deploy.**
