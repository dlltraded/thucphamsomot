# KỊCH BẢN NGÀY THỬ 10 ĐƠN THẬT (KiotViet → TPS1)

> Lập 20/09/2026. Bám `KE_HOACH_GOLIVE_PILOT_10_DON.md` mục 1 và 6. KiotViet vẫn là sổ kế toán chính; TPS1 chạy song song để đối chiếu.
> Giai đoạn này: 1 sale phụ trách toàn bộ khách (Nguyễn Thái Hoà), các tài khoản thu mua/kho/kế toán/sale 2 là tài khoản TEST (tạo bằng `scripts/create-staff-accounts.mjs`).

## 0. Chuẩn bị (làm trước ngày thử, T-1)

| # | Việc | Ai | Xong khi |
|---|------|----|----------|
| 1 | Chạy migration còn thiếu (kiểm bằng `node --env-file=.env scripts/check-migration-status.mjs` → 19/19). **`20260920d` chỉ chạy lúc deploy**, sau khi code mới lên | Anh | Script báo đủ |
| 2 | Tạo tài khoản test: `node --env-file=.env scripts/create-staff-accounts.mjs --apply`, chép mật khẩu (chỉ hiện 1 lần) | Anh | 4 tài khoản đăng nhập được |
| 3 | Chọn **10 đơn thật** của 1 ngày giao từ KiotViet (xem mục 1) và xuất file chi tiết từng dòng hàng (xlsx) | Anh | File nằm trong `tmp/` (không commit) |
| 4 | Chọn 3–5 khách thử; đảm bảo có địa chỉ giao (`customer_addresses`) và đã xác thực, có hạng giá đúng | Anh + Claude | Khách đăng nhập/được tạo đơn hộ được |
| 5 | Kiểm tra 3 cách tính giá: giá gốc / hạng VIP / giá hợp đồng của các khách thử khớp KiotViet | Anh | Ghi rõ khách nào dùng giá nào |
| 6 | Thử nội bộ 2–3 đơn giả (khách test, ngày giao khác) để chắc luồng chạy, rồi huỷ | Sale + Claude | Cổng B qua |
| 7 | Deploy code (sau bước 6), rồi chạy `20260920d` | Anh | Đăng ký khách mới có mã TPS1-… |

## 1. Bộ 10 đơn cần có (chọn từ KiotViet)

Bắt buộc phủ đủ các tình huống sau (một đơn có thể gánh nhiều tình huống):

| Mã tình huống | Nội dung | Kỳ vọng đúng |
|---|---|---|
| T1 | ≥ 3 khách khác nhau: 1 trường/bếp nhỏ, 1 công ty, 1 điểm Hiệp Phát | Mỗi khách đúng địa chỉ/điểm giao |
| T2 | 1 dòng **số lượng lẻ (kg thập phân)** như 2,5 kg | Tiền = SL × đơn giá, không làm tròn sai |
| T3 | 1 dòng **ghi chú quy cách** (vd. "cắt lát 3mm") | Ghi chú xuất hiện ở đơn tổng, phiếu soạn, chi tiết đơn |
| T4 | 1 mặt hàng **chưa có giá** | Đơn không chốt được khi chưa áp giá; áp giá xong mới chốt |
| T5 | 1 đơn nhập **sau 16:30 ngày D-1** | Được nhận, gắn cờ "Trễ giờ chốt", không lẫn vào "đơn sạch" khi xuất tổng |
| T6 | 1 đơn **giao thiếu** 1 mặt hàng | Xác nhận thực giao: SL giảm, tiền giảm, hóa đơn chỉ tính hàng đã giao, kho cân đúng |
| T7 | 1 đơn **khách xin điều chỉnh** sau khi có phiếu xác nhận | Có yêu cầu điều chỉnh → sale duyệt → phiếu/tổng cập nhật, hiện ở khối "thay đổi sau khi xuất" |
| T8 | 1 đơn **khách xin hủy sau giờ chốt** | Sale duyệt → đơn hủy, kho hoàn, có văn bản Zalo báo Thu mua; đơn tổng ghi "đã hủy sau khi xuất" |
| T9 | 1 khách **chưa xác thực** | Không chốt được cho đến khi xác thực (hoặc bị chặn có thông báo rõ) |
| T10 | 1 đơn khách tự đặt `pending` rồi **tự hủy trước giờ chốt** | Hủy được ngay, không cần duyệt |

Mỗi đơn khi nhập vào TPS1 **bắt buộc điền ô "Mã KiotViet"** (mã đặt hàng/hóa đơn KiotViet) — đây là khóa để `pilot-compare` đối chiếu.

## 2. Dòng thời gian trong ngày

Ví dụ: ngày giao = **T2 22/09**, ngày nhập/chốt = **T7 20/09 → C.nhật 21/09**. (Điều chỉnh theo ngày thật.) Giờ chốt mặc định 16:30 D-1; giao CN/T2 thì chốt 17:00 thứ Bảy.

| Giờ | Việc | Vai | Ghi/kiểm |
|---|---|---|---|
| Sáng D-1 | Nhập 9–10 đơn vào POS (**bấm giờ từng đơn**) | Sale | Ghi thời gian từng đơn vào bảng mục 3 |
| Sáng D-1 | Xem "Yêu cầu" của khách/kiểm giá; áp giá cho hàng chưa có giá | Sale | T4 |
| Trước giờ chốt | Chốt giá → phiếu xác nhận; đơn sạch chuyển `confirmed` | Sale | T9 bị chặn đúng |
| 16:25–16:35 | Nhập 1 đơn **trễ** (sau 16:30) | Sale | T5 |
| 16:35 | Xuất **Đơn tổng** (Excel) gửi Thu mua | Sale | Lưu file, ghi checksum số đơn/dòng |
| 16:40 | Thu mua **đối chiếu tay** file tổng với KiotViet: tổng SL từng mặt hàng | Thu mua | Ghi chênh |
| Sau xuất | Khách yêu cầu điều chỉnh (T7) + hủy (T8): sale duyệt, copy văn bản Zalo gửi Thu mua | Sale | Khối đỏ trong Đơn tổng |
| Sáng D | Soạn hàng theo phiếu tạm | Kho | Trạng thái `preparing`, tồn trừ đúng |
| Giao | Chuyển `shipping`; giao; **giao thiếu 1 mặt hàng** (T6) | Sale/người giao | |
| Sau giao | Bấm **Xác nhận thực giao** (hoặc "Giao đủ 100%") nhập SL thực | Sale | T6: tiền tự tính lại |
| Sau giao | **Hoàn thành** + hóa đơn | Sale | Hóa đơn theo SL thực giao |
| Cuối ngày | Ghi nhận thanh toán / công nợ | Kế toán | paid_amount, debt |
| Cuối ngày | Khách mở Web/Mini App xem đơn + tải chứng từ | Khách thử | T-xem chứng từ |
| Cuối ngày | Chạy đối chiếu (mục 4) | Claude/Anh | Bảng kết quả |

## 3. Bảng bấm giờ nhập đơn (điền trong ngày)

| Mã KiotViet | Khách | Số dòng | Thời gian nhập TPS1 (phút) | Thời gian ở KiotViet (phút) | Ghi chú |
|---|---|---|---|---|---|
| | | | | | |

Đạt (f): TB thời gian nhập TPS1 ≤ KiotViet.

## 4. Đối chiếu với KiotViet (script chỉ đọc)

Liệt kê đơn + mốc thời gian của ngày giao (không cần file):

```bash
node --env-file=.env scripts/pilot-compare.mjs --date=2026-09-22
```

Đối chiếu với file KiotViet (hóa đơn = so theo thực giao; đơn đặt hàng = so theo khách đặt):

```bash
node --env-file=.env scripts/pilot-compare.mjs --file=tmp/kiotviet_10_don.xlsx --date=2026-09-22 --out=tmp/pilot_compare.json
node --env-file=.env scripts/pilot-compare.mjs --file=tmp/kiotviet_dat_hang.xlsx --date=2026-09-22 --basis=ordered
```

Script kiểm từng đơn: tổng tiền (dung sai 500đ), số dòng, SL & đơn giá từng mặt hàng (theo mã hàng), mã khách; cảnh báo đơn TPS1 chưa có Mã KiotViet. Chênh có lý do (VD giao thiếu, chỉnh giá đã thống nhất) thì ghi vào bảng mục 6, không tính là lỗi.

## 5. Tiêu chí đạt/không đạt (từ kế hoạch mục 1)

- [ ] (a) 10/10 đơn đi hết vòng đời, **không phải sửa DB tay**
- [ ] (b) Tổng tiền hóa đơn khớp KiotViet từng đơn (hoặc chênh có lý do ghi rõ)
- [ ] (c) File tổng gộp khớp đối chiếu tay của Thu mua
- [ ] (d) ≥ 1 đơn điều chỉnh (T7) và ≥ 1 đơn yêu cầu hủy (T8) đi đúng luồng
- [ ] (e) Không có lỗi mức "chặn"
- [ ] (f) Thời gian nhập/đơn ≤ KiotViet

## 6. Sổ lỗi trong ngày

| # | Mô tả (bước nào, đơn nào) | Mức: Chặn / Phải sửa / Để sau | Người báo | Trạng thái |
|---|---|---|---|---|
| | | | | |

Nguyên tắc: lỗi **Chặn** → dừng nhánh đó, Claude sửa nóng, chạy lại đơn; lỗi **Phải sửa** → sửa trước ngày thử kế; **Để sau** → ghi backlog. Sửa xong mới sang ngày thử kế.

## 7. Điều cần tránh / lưu ý an toàn

- Không sửa DB tay. Nếu buộc phải, ghi lại vào sổ lỗi (đó là lỗi "Chặn").
- Không lưu mật khẩu/token vào file. Mật khẩu tài khoản test chỉ ở trình quản lý mật khẩu của anh.
- Nếu đơn nhập nhầm: hủy đơn (kèm lý do) rồi nhập lại, đừng xóa.
- Sau giai đoạn thử: đổi mật khẩu admin, vô hiệu hóa tài khoản test (`is_active=false`), đặt lại người phụ trách theo từng sale thật.
- Nếu cần lùi (rollback): tắt truy cập POS/portal, tiếp tục dùng KiotViet như cũ; dữ liệu TPS1 không ảnh hưởng sổ KiotViet vì đồng bộ một chiều.
