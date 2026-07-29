# TPS1 — Checklist claim, quyền riêng tư và launch

## Ma trận claim

| Claim | Trạng thái | Cách dùng |
|---|---|---|
| Nhà cung ứng nguyên liệu thực phẩm B2B | Dùng | Đúng với website, hồ sơ và quy trình |
| Rau củ, thịt cá, đông lạnh, gia vị, chay | Dùng | Chỉ nêu nhóm TPS1 thực sự đang cung ứng |
| Báo giá theo sản lượng | Dùng | Không nói “rẻ nhất” |
| Giao định kỳ theo thỏa thuận | Dùng | Không cam kết 100% đúng giờ |
| Hóa đơn VAT/chứng từ | Dùng sau xác nhận vận hành | Sale xác nhận trước launch |
| Hồ sơ ATTP cung cấp theo yêu cầu | Dùng | Không diễn đạt sản phẩm “đạt ISO” |
| ISO 22000/HACCP, bảo hiểm 5 tỷ | Chờ chứng từ | Kiểm ngày hiệu lực, pháp nhân, phạm vi và quyền quảng cáo |
| 109+ khách, 13 tỷ/tháng, SLA 99,8% | Không dùng | Chỉ mở lại khi có dữ liệu kiểm toán được |
| 10+ năm | Không dùng | Hồ sơ thành lập 2017 chưa đủ 10 năm tại 07/2026 |
| 100% giao đúng hẹn/100% mẫu đạt | Không dùng | Claim tuyệt đối, rủi ro cao |
| Logo/tên khách hàng | Chờ quyền | Phải có chấp thuận bằng văn bản |
| Toàn bộ xe có chuỗi lạnh | Không dùng | Chưa có bằng chứng cho toàn bộ tuyến |

## Privacy và dữ liệu

- Form nêu rõ mục đích: liên hệ tư vấn và báo giá theo yêu cầu.
- Consent phải chủ động, không tick sẵn; lưu thời gian, nguồn và nội dung consent.
- Có cách yêu cầu ngừng liên hệ/xóa dữ liệu qua hotline hoặc email.
- Không mua/scrape dữ liệu cá nhân; không upload dữ liệu tuyến giao lên Meta.
- Customer list/lookalike chỉ dùng khi có lawful basis/quyền phù hợp và đã làm sạch test/trùng.
- Không viết copy ám chỉ biết người xem đang làm ở công ty/khu vực cụ thể.
- Nguồn: https://www.facebook.com/legal/terms/customaudience
- Nguồn: https://www.facebook.com/business/ads/review-policy-guidelines
- Nguồn pháp luật: https://xaydungchinhsach.chinhphu.vn/quy-dinh-bao-ve-du-lieu-ca-nhan-thu-duoc-tu-hoat-dong-ghi-am-ghi-hinh-tai-noi-cong-cong-119250730154729554.htm

## Launch gate ngày 4

- [ ] Business Manager đúng chủ thể; Page/ad account có ít nhất hai admin.
- [ ] Tất cả admin bật 2FA.
- [ ] Domain được xác minh.
- [ ] `NEXT_PUBLIC_META_PIXEL_ID` đã cấu hình trên Vercel và production deploy lại.
- [ ] Pixel Helper thấy PageView và Lead đúng một lần.
- [ ] UTM, fbclid, campaign/ad set/ad names vào Google Sheets.
- [ ] Form A và B dùng Higher Intent/review screen.
- [ ] Consent và link `/chinh-sach` hoạt động trên mobile.
- [ ] Tạo lead test từ từng ad; tiếng Việt và SĐT không lỗi.
- [ ] Email/CRM nhận lead trong hai phút.
- [ ] Owner sale nhận thông báo và gọi test trong 15 phút.
- [ ] Lead scoring đúng cho ít nhất 5 ca: qualified, mua lẻ, ngoài vùng, thiếu công ty, có file.
- [ ] Lead trùng được đánh dấu/không gọi chồng.
- [ ] Creative không chứa claim chưa duyệt hoặc logo chưa có quyền.
- [ ] Dashboard có owner nhập spend và outcome hằng ngày.
- [ ] Kill/scale rules được ghi vào ghi chú campaign.

## Cấu hình môi trường

```env
NEXT_PUBLIC_META_PIXEL_ID=your_pixel_id
GOOGLE_SHEET_WEBHOOK_URL=your_apps_script_web_app_url
```

Conversions API cần cấu hình server-side riêng với token lưu trong secret môi trường; không đặt access token ở biến `NEXT_PUBLIC_*` hoặc mã frontend. Khi triển khai CAPI, deduplicate browser/server events bằng cùng `event_id`.