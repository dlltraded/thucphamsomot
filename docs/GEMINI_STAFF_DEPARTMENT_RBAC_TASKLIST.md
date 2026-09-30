# TASKLIST GEMINI — Quản lý nhân viên, phòng ban và phân quyền TPS1

## 1. Mục tiêu

Hoàn thiện chức năng **Quản lý nhân viên** trên `quanly.thucphamsomot.vn` để Admin có thể:

- Xem và tìm kiếm nhân viên.
- Tạo tài khoản nhân viên.
- Gán đúng **phòng ban**, **chức vụ** và **vai trò nghiệp vụ**.
- Sửa thông tin phân quyền.
- Khóa/mở lại tài khoản theo kiểu vô hiệu hóa mềm.
- Reset mật khẩu an toàn.
- Kiểm tra được quyền thực tế sau khi đăng nhập.

Ba khái niệm phải tách biệt:

| Khái niệm | Ý nghĩa | Ví dụ |
|---|---|---|
| Phòng ban | Đơn vị tổ chức | Phòng Vận hành 1, Phòng Thu mua |
| Chức vụ | Cấp bậc trong tổ chức | Nhân viên, Trưởng nhóm, Trưởng phòng |
| Vai trò nghiệp vụ | Nhóm quyền trong phần mềm | Vận hành, Thu mua, Kế toán |

Không được dùng chức vụ thay cho role và không được suy role chỉ từ tên phòng ban.

## 2. Dữ liệu production đã có — không tạo lại

Migration `20260930_business_executive_departments.sql` đã chạy thành công. Production hiện có:

- `BGD` — Ban Giám đốc — `executive`
- `KDMKT` — Phòng Kinh doanh & Marketing — `business_marketing`
- `KT` — Phòng Kế toán — `accounting`
- `TM` — Phòng Thu mua — `procurement`
- `VH1` — Phòng Vận hành 1 — `operations`
- `VH2` — Phòng Vận hành 2 — `operations`

Role hợp lệ trong database:

- `admin`
- `ban_giam_doc`
- `truong_phong`
- `sale`
- `thu_mua`
- `kho`
- `ke_toan`
- `tai_xe`

Chức vụ hợp lệ:

- `nhan_vien`
- `tro_ly`
- `truong_nhom`
- `truong_phong`
- `ban_giam_doc`
- `quan_tri_he_thong`

## 3. Nguyên tắc quyền đã chốt

1. `admin` là quản trị kỹ thuật, có toàn quyền hệ thống và quản lý tài khoản.
2. `ban_giam_doc` là quyền điều hành nghiệp vụ toàn công ty:
   - Xem mọi đơn hàng, khách hàng, hàng hóa, bảng giá, công nợ và báo cáo.
   - Tạo đơn, xác nhận giá, duyệt điều chỉnh, gộp đơn, xuất chứng từ.
   - Được duyệt/kích hoạt bảng giá khi API tương ứng đã có.
   - Không mặc định có quyền kỹ thuật như tạo/xóa tài khoản Auth hoặc thay cấu hình hệ thống; `admin.manage_staff` vẫn chỉ dành cho `admin` trong giai đoạn này.
3. `truong_phong` là người có quyền cao nhất **trong phòng của mình**, không phải người phê duyệt mọi nghiệp vụ của toàn công ty.
4. Nhân viên Kinh doanh & Marketing dùng phòng `KDMKT`; role nghiệp vụ chọn theo công việc thực tế, không tự động biến thành Admin.
5. Không xóa cứng tài khoản nhân viên hoặc dữ liệu lịch sử. Chỉ khóa bằng `is_active = false`.
6. Tất cả thay đổi tài khoản phải đi qua Server API; client không được ghi trực tiếp `admin_profiles` hoặc dùng `service_role`.

## 4. Phạm vi được phép sửa

- `app/api/admin/users/**`
- `app/api/sale-auth/route.ts` nếu cần chặn tài khoản đã khóa hoặc trả đủ hồ sơ mới.
- `lib/permissions.ts`
- `manage/src/lib/permissions.ts`
- `manage/src/contexts/AuthContext.tsx`
- `manage/src/App.tsx`
- `manage/src/layouts/SaleLayout.tsx`
- Tạo mới trang/component phục vụ `/nhan-vien` trong `manage/src/pages/**`.
- Migration bổ sung chỉ khi thực sự cần cho reset mật khẩu bắt buộc; phải là file mới, idempotent, không sửa migration đã chạy.
- Test liên quan trực tiếp đến nhân viên/RBAC.

Không được sửa nghiệp vụ đơn hàng, gộp đơn, bảng giá, khách hàng, tồn kho, PDF, Mini App hoặc website marketing trong task này.

## 5. Tasklist triển khai

### G0 — Kiểm tra an toàn trước khi sửa

- [ ] Đọc `AGENTS.md` nếu repo có.
- [ ] Ghi lại `git status`; không hoàn tác hoặc ghi đè thay đổi đang có của Codex/người dùng.
- [ ] Xác nhận build hiện tại của root và `manage` trước khi sửa.
- [ ] Không chạy seed và không sửa trực tiếp dữ liệu production.
- [ ] Không đưa `.env`, token, password, file Excel khách hàng hoặc service key vào Git/log/walkthrough.

### G1 — Đồng bộ mô hình role ở server và client

- [ ] Thêm `ban_giam_doc` vào type `Role` của cả:
  - `lib/permissions.ts`
  - `manage/src/lib/permissions.ts`
- [ ] Đổi nhãn `admin` thành **Quản trị hệ thống**, không dùng nhãn “Quản trị / BGĐ”.
- [ ] Thêm nhãn `ban_giam_doc`: **Ban Giám đốc**.
- [ ] Bổ sung `pricing.view` ở client nếu đang thiếu để khớp server.
- [ ] Đồng bộ toàn bộ permission giữa server và client, không để hai file lệch nhau.
- [ ] Bổ sung quyền nghiệp vụ của `ban_giam_doc` theo mục 3, nhưng giữ `admin.manage_staff` chỉ có `admin`.
- [ ] Nâng `canForProfile()` để xử lý rõ:
  - Admin toàn quyền.
  - Ban Giám đốc có quyền nghiệp vụ toàn công ty.
  - Trưởng phòng kế thừa quyền theo đúng `department.function_group`.
  - Nhân viên thường dùng role đã gán.
- [ ] Không map mặc định mọi function group không phải operations/procurement thành kế toán. Phải xử lý riêng `executive` và `business_marketing`.
- [ ] Route guard và sidebar phải dùng cùng một cách kiểm tra hồ sơ; không chỉ dùng `can(role)` nếu quyền cần phòng ban/chức vụ.

### G2 — Hoàn thiện API quản lý nhân viên

File nền hiện có: `app/api/admin/users/route.ts`.

- [ ] GET chỉ cho `admin`, trả danh sách nhân viên và phòng ban đang hoạt động.
- [ ] POST chỉ cho `admin`, validate đầy đủ:
  - Email hợp lệ, chuẩn hóa lowercase/trim.
  - Họ tên không rỗng.
  - Mật khẩu đủ an toàn.
  - Role thuộc danh sách hợp lệ, bao gồm `ban_giam_doc`.
  - Position thuộc danh sách hợp lệ.
  - Phòng ban tồn tại và đang hoạt động.
  - `admin`/`quan_tri_he_thong` có thể không thuộc phòng; nhân viên nghiệp vụ bắt buộc chọn phòng.
- [ ] PATCH phải thêm `ban_giam_doc` vào `allowedRoles` và validate tổ hợp phòng ban/chức vụ/role.
- [ ] Không cho Admin tự khóa chính tài khoản đang đăng nhập.
- [ ] Không cho hạ quyền hoặc khóa **Admin hoạt động cuối cùng**.
- [ ] Khi khóa tài khoản, đăng nhập mới phải bị từ chối ngay; API nghiệp vụ cũng phải từ chối phiên của tài khoản `is_active = false`.
- [ ] Tạo endpoint reset mật khẩu nhân viên ở server:
  - Sinh mật khẩu tạm đủ mạnh, giữ nguyên chữ hoa/chữ thường.
  - Cập nhật qua Supabase Admin API.
  - Trả về đúng một payload gồm email/tên đăng nhập và mật khẩu tạm để UI cho phép copy một lần.
  - Không ghi mật khẩu vào database, console, audit log hoặc Git.
- [ ] Nếu triển khai bắt buộc đổi mật khẩu lần đầu cho nhân viên, tạo migration mới thêm cờ phù hợp và hoàn thiện cả luồng đổi mật khẩu; không chỉ thêm field rồi bỏ dở UI.
- [ ] Thông báo lỗi bằng tiếng Việt tự nhiên, không trả raw database error cho người dùng.

### G3 — Màn hình Quản lý nhân viên

- [ ] Tạo route `/nhan-vien`, bọc `StaffOnlyRoute perm="admin.manage_staff"`.
- [ ] Thêm menu **Quản lý nhân viên** trong nhóm quản trị; chỉ Admin nhìn thấy.
- [ ] Trang danh sách có:
  - Tìm theo tên/email.
  - Lọc phòng ban.
  - Lọc vai trò.
  - Lọc trạng thái hoạt động/đã khóa.
  - Cột: Họ tên, Email, Phòng ban, Chức vụ, Vai trò, Trạng thái, Thao tác.
- [ ] Có skeleton/loading, empty state và error state; không dùng `alert()` của trình duyệt.
- [ ] Responsive desktop/mobile; mobile dùng card hoặc bảng cuộn hợp lý, không tràn viewport.
- [ ] Modal **Tạo nhân viên** gồm:
  - Họ tên.
  - Email đăng nhập.
  - Mật khẩu tạm với nút hiện/ẩn và tạo lại.
  - Phòng ban.
  - Chức vụ.
  - Vai trò nghiệp vụ.
- [ ] Modal **Sửa nhân viên** không hiển thị/sửa password trực tiếp.
- [ ] Khóa/mở tài khoản phải có modal xác nhận nêu rõ tên nhân viên và tác động.
- [ ] Reset mật khẩu phải dùng modal kết quả, không dùng alert:
  - Hiển thị email/tên đăng nhập.
  - Hiển thị mật khẩu tạm đúng nguyên bản, không biến thành chữ hoa.
  - Nút **Sao chép thông tin đăng nhập** copy cả email và mật khẩu trong một lần.
  - Có dòng nhắc đổi mật khẩu khi đăng nhập lần đầu nếu luồng bắt buộc đổi mật khẩu đã hoàn thiện.
- [ ] Không để câu chữ kỹ thuật như `role`, `function_group`, `service_role`, `payload` xuất hiện trên UI live.

### G4 — Kiểm soát tổ hợp phòng ban, chức vụ và role

- [ ] UI có gợi ý hợp lý nhưng không tự gán âm thầm.
- [ ] Các tổ hợp cần hỗ trợ tối thiểu:

| Phòng ban | Chức vụ | Role gợi ý |
|---|---|---|
| Ban Giám đốc | Ban Giám đốc | `ban_giam_doc` |
| Kinh doanh & Marketing | Nhân viên/Trưởng phòng | `sale` hoặc `truong_phong` |
| Vận hành 1/2 | Nhân viên/Trưởng phòng | `sale` hoặc `truong_phong` |
| Thu mua | Nhân viên/Trưởng phòng | `thu_mua` hoặc `truong_phong` |
| Kế toán | Nhân viên/Trưởng phòng | `ke_toan` hoặc `truong_phong` |

- [ ] Nếu chọn `ban_giam_doc`, chỉ cho chọn phòng `BGD` và chức vụ `ban_giam_doc`.
- [ ] Nếu chọn `admin`, chức vụ mặc định `quan_tri_he_thong`; phòng ban có thể để trống.
- [ ] Với `truong_phong`, bắt buộc có phòng ban và position `truong_phong`.
- [ ] Validation giống nhau ở UI và API; API mới là nguồn quyết định cuối cùng.

### G5 — Kiểm thử bắt buộc

- [ ] Unauthenticated gọi `/api/admin/users` nhận 401/403.
- [ ] Role khác Admin gọi API quản lý nhân viên nhận 403.
- [ ] Admin thấy đủ 6 phòng ban production.
- [ ] Tạo thử một tài khoản cho mỗi nhóm: Ban Giám đốc, Kinh doanh & Marketing, Vận hành, Thu mua, Kế toán.
- [ ] Tài khoản bị khóa không đăng nhập được.
- [ ] Không thể tự khóa Admin đang dùng.
- [ ] Không thể khóa/hạ quyền Admin cuối cùng.
- [ ] Reset mật khẩu đăng nhập được bằng đúng chuỗi phân biệt hoa/thường.
- [ ] Ban Giám đốc xem được các màn nghiệp vụ toàn công ty nhưng không vào được `/nhan-vien` nếu không phải Admin.
- [ ] Trưởng phòng Vận hành không tự có quyền Kế toán/Thu mua ngoài phạm vi đã định nghĩa.
- [ ] Nhân viên KDMKT không tự có toàn quyền vì thuộc phòng KDMKT.
- [ ] Gõ thẳng URL không đủ quyền phải bị route guard chặn.
- [ ] Reload/refresh vẫn khôi phục đúng department, position và role từ phiên đăng nhập.
- [ ] Chạy:
  - Root: `npm run build`
  - Manage: `npm run build`
- [ ] Không có lỗi TypeScript, build hoặc console error mới.

## 6. Tiêu chí nghiệm thu

Task chỉ được coi là hoàn thành khi:

1. Có màn `/nhan-vien` hoạt động đầy đủ, không phải UI tĩnh.
2. Role `ban_giam_doc` được đồng bộ ở database, server, client, login session, permission và UI.
3. Hai phòng mới hiển thị đúng trong form và bộ lọc.
4. Admin tạo/sửa/khóa/reset được nhân viên qua API bảo mật.
5. Không có client-side direct write vào `admin_profiles`.
6. Không xóa cứng nhân viên.
7. Test quyền âm tính (403/chặn URL) đạt, không chỉ test happy path.
8. Hai build thành công.
9. Không lộ bí mật hoặc dữ liệu nhạy cảm trong Git/log.

## 7. Cách bàn giao cho Codex

Gemini phải dừng trước merge/deploy và cung cấp:

- Danh sách file đã sửa/tạo.
- Tóm tắt API và ma trận quyền đã thay đổi.
- Kết quả từng test G5.
- Kết quả hai lệnh build.
- Ảnh chụp 4 trạng thái: danh sách desktop, form tạo, form sửa/reset, mobile.
- Migration mới nếu có, kèm lý do và rollback an toàn.
- Commit hash trên nhánh riêng.
- Các hạn chế hoặc phần chưa làm xong phải nêu rõ; không được báo “100% hoàn tất” nếu chưa test production/staging.

Codex sẽ review code, kiểm tra bảo mật, chạy test độc lập rồi mới quyết định merge và deploy.
