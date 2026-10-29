# Rà soát tốc độ live — 29/10/2026

## Phương pháp và giới hạn

Phiên Admin trên trình duyệt tích hợp, đúng domain quanly.thucphamsomot.vn. Chỉ đọc; không lấy token, không tạo/sửa đơn hoặc công nợ. Mỗi màn có 6 mẫu mở/tải lại. Thời gian đo bằng đồng hồ phía điều khiển, gồm overhead công cụ. Sàng lọc theo main/spinner không chứng minh tất cả truy vấn phụ đã hoàn tất. Không phải latency API hay p95 API.

Không truy cập được Resource Timing trong scope quan sát; capability CDP không trả tài liệu sử dụng. Không suy đoán network/database timings. Chưa hoàn thành 5 lượt quay lại bằng menu, 20 lượt API của nhóm chậm, tất cả kịch bản filter và so sánh sau triển khai. Không coi audit đã nghiệm thu toàn bộ.

## Sàng lọc trước sửa

| Module | Mẫu | Nhỏ nhất (ms) | Lớn nhất (ms) |
|---|---:|---:|---:|
| Công nợ | 6 | 2313 | 3626 |
| Soạn hàng | 6 | 1296 | 2038 |
| Đơn tổng | 6 | 1549 | 1963 |
| Thiết lập giá | 6 | 1493 | 2550 |
| Khách hàng | 6 | 1412 | 3090 |
| Hàng hóa | 6 | 1329 | 1868 |
| Hóa đơn | 6 | 1077 | 1534 |
| POS | 6 | 1502 | 2019 |
| Áp giá hàng ngày | 6 | 1098 | 1551 |
| Báo cáo | 6 | 1170 | 1567 |
| Đặt hàng | 6 | 1336 | 1481 |
| Dashboard | 6 | 1082 | 1910 |

Mở sổ nợ hai khách đã kiểm tra; lượt khách thứ hai khoảng 2102ms gồm overhead điều khiển. Không đưa tên, số dư hoặc thông tin khách vào báo cáo.

## Điểm sửa có bằng chứng mã nguồn

- Công nợ: tên Sale được chờ trước truy vấn khách; phiếu thu và điều chỉnh được chờ nối tiếp. Chuyển các cặp truy vấn độc lập sang Promise.all, giữ nguyên scope và engine tính toán.
- Thêm Server-Timing auth/data_and_compute và Cache-Control private,no-store cho response summary thành công.
- Chi tiết sổ nợ chưa hủy request cũ khi đổi khách: thêm AbortController và guard trước cập nhật state.

## Còn phải làm

- Đo lại Công nợ sau deploy; kiểm tra dữ liệu nhất quán.
- Hoàn thiện toàn bộ kịch bản menu/filter/chi tiết, đặc biệt nhiều bảng giá và chuyển khách POS.
- Đo network/API qua công cụ được hỗ trợ, không trích xuất session.
- Kiểm tra EXPLAIN trước quyết định chỉ mục; chưa thêm chỉ mục và chưa đổi hạ tầng.
