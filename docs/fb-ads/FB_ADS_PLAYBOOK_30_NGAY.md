# TPS1 Facebook Ads — Playbook triển khai 30 ngày

## 1. North star

- Ngân sách: 6.000.000đ/30 ngày.
- Mục tiêu: lead B2B mua nguyên liệu định kỳ; không lấy lead bán lẻ.
- Chỉ số chính: CPQL = chi tiêu / Qualified Lead.
- SLA: xác nhận yêu cầu trong 30 phút; hoàn thành báo giá trong 24 giờ.
- Qualified Lead: tổ chức xác định được, thuộc vùng phục vụ, mua định kỳ, nhu cầu tương đối rõ, đồng ý trao đổi/gửi danh sách; điểm CRM từ 7.

## 2. Cấu hình Ads Manager

### Campaign

- Tên: `TPS1_LEADS_PROSPECTING_V1_202607`
- Objective: Leads; conversion location: Instant Forms.
- Buying: Auction; optimization ban đầu: Maximize number of leads.
- Advantage+ placements; ngôn ngữ Việt; tuổi 25–55; mọi giới tính.
- Attribution: 7-day click/1-day view nếu tài khoản cho phép.
- Không dùng Traffic. Chỉ chuyển sang Conversion Leads khi QualifiedLead được trả về ổn định.

### Giai đoạn và ngân sách

| Giai đoạn | Ngày | Ngân sách | Thực thi |
|---|---:|---:|---|
| Baseline | 1–14 | 2.800.000đ | 200.000đ/ngày, hai ad set 100.000đ/ngày |
| Tối ưu | 15–24 | 2.000.000đ | 70% winner, 30% creative/offer còn lại |
| Chốt tháng | 25–30 | 1.200.000đ | 80% prospecting winner; tối đa 20% warm nếu đủ tệp |

### Ad set 1 — `AS_DN_BIENHOA_CORE_BROAD_V1`

- People living in: Biên Hòa, Tam Hiệp, Long Bình, AMATA, KCN Biên Hòa 2, Phước Tân.
- Dùng địa danh/KCN công khai và kiểm tra audience preview để tránh tràn sâu TP.HCM.
- Broad geo; không chồng nhiều interest.

### Ad set 2 — `AS_DN_LONGTHANH_NHONTRACH_BROAD_V1`

- People living in: Tam Phước, Giang Điền, An Phước, Long Thành, KCN Long Thành, Nhơn Trạch, KCN Nhơn Trạch 1/2/3, Phước An.
- Giữ creative và copy giống ad set 1 để đo khác biệt địa bàn.

### Loại trừ và UTM

- Loại 180-day submitted-form audience khỏi prospecting.
- Chỉ loại khách hiện hữu/nhân viên khi có danh sách first-party hợp pháp.
- Không tải tọa độ giao hàng hoặc danh sách chưa có quyền lên Meta.
- UTM landing page:
  `utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}`

## 3. Hai Instant Form Higher Intent

### Form A — Báo giá theo danh sách

Intro: “Gửi danh sách hàng hiện tại — TPS1 đề xuất quy cách và báo giá theo sản lượng trong 24 giờ.”

Trường bắt buộc: công ty/cơ sở, người liên hệ, SĐT/Zalo, loại hình, vai trò, khu vực, nhóm hàng, suất/ngày, tần suất, thời điểm cần, có danh sách hàng hay chưa, consent.

Thank-you: “TPS1 xác nhận trong 30 phút; hoàn thành báo giá trong 24 giờ.” Nút gọi `089 890 2222`, nút mở Zalo và hướng dẫn gửi Excel/PDF/ảnh.

### Form B — Checklist chọn nhà cung cấp

Intro: “Nhận checklist 15 điểm đánh giá nhà cung cấp thực phẩm cho bếp/nhà máy, kèm mẫu danh sách đặt hàng.”

Giữ cùng trường lọc; CTA sau form là nhận checklist và gửi danh sách nếu muốn TPS1 rà phương án.

## 4. Sáu mẫu quảng cáo

### AD01 — Một đầu mối nhiều nhóm hàng

**Primary text:** Mỗi ngày phải đối soát nhiều nhà cung cấp cho rau củ, thịt cá, đông lạnh và gia vị? TPS1 tiếp nhận một danh sách nhu cầu, rà quy cách và xây phương án báo giá theo sản lượng cho bếp ăn và doanh nghiệp. Gửi Excel, PDF hoặc ảnh danh sách hàng; đội ngũ xác nhận trong 30 phút và hoàn thành báo giá trong 24 giờ. Phù hợp nhu cầu mua định kỳ tại Biên Hòa, Long Thành và Nhơn Trạch.

**Headline:** Một đầu mối cho nhiều nhóm hàng  
**Description:** Báo giá B2B theo sản lượng  
**CTA:** Nhận báo giá  
**Visual:** Ảnh thật các nhóm hàng + file Excel + nhân viên kho; không dùng logo khách khi chưa có quyền.

### AD02 — Thiếu hàng trước ca

**Primary text:** Bếp chuẩn bị vào ca nhưng hàng thiếu, sai quy cách hoặc đến không đúng khung giao là rủi ro vận hành thật. TPS1 làm việc từ danh sách hàng, tần suất và địa điểm giao cụ thể để đề xuất phương án cung ứng định kỳ. Anh/chị đang phụ trách bếp, canteen hoặc thu mua tại Đồng Nai? Gửi nhu cầu để nhận phương án và báo giá trong 24 giờ.

**Headline:** Đừng để bếp chờ nguyên liệu  
**Description:** Rà nhu cầu và lịch giao định kỳ  
**CTA:** Đăng ký  
**Video 25s:** 0–3s bếp sắp vào ca; 3–10s thiếu/sai hàng; 10–19s TPS1 kiểm list–soạn hàng–xếp xe; 19–25s CTA gửi danh sách.

### AD03 — Hồ sơ cho bộ phận thu mua

**Primary text:** Giá chỉ là một phần của quyết định chọn nhà cung cấp. Bộ phận thu mua còn phải kiểm nguồn hàng, quy cách, chứng từ, khả năng giao định kỳ và cách xử lý lô hàng không phù hợp. Nhận checklist 15 điểm để rà nhà cung cấp thực phẩm cho bếp/nhà máy. Nếu cần, TPS1 sẽ tiếp nhận danh sách và chuẩn bị phương án báo giá theo sản lượng.

**Headline:** Checklist chọn nhà cung cấp  
**Description:** Dành cho thu mua và quản lý bếp  
**CTA:** Đăng ký  
**Carousel:** hồ sơ; quy cách; lịch giao; đối soát; xử lý sai lệch.

### AD04 — Đúng quy cách, dễ đối soát

**Primary text:** Cùng một tên hàng nhưng sai size, sơ chế hoặc đơn vị tính có thể làm lệch định lượng và food cost. TPS1 nhận danh sách hiện tại, rà lại quy cách và tần suất trước khi báo giá. Gửi file để đội ngũ xác nhận trong 30 phút và hoàn thành báo giá trong 24 giờ — không cam kết mua, không ràng buộc.

**Headline:** Rà quy cách trước khi báo giá  
**Description:** Giảm sai lệch khi nghiệm thu  
**CTA:** Nhận báo giá

### AD05 — Bằng chứng vận hành địa phương

**Primary text:** TPS1 đang tổ chức các tuyến giao nguyên liệu B2B từ kho Tam Hiệp đến các cụm Biên Hòa, Long Thành và Nhơn Trạch. Nếu bếp của anh/chị mua rau củ, thịt cá, đông lạnh hoặc gia vị định kỳ, hãy gửi khu vực, số suất và danh sách hàng. TPS1 sẽ kiểm tra khả năng phục vụ trước khi báo giá.

**Headline:** Kiểm tra tuyến giao TPS1  
**Description:** Ưu tiên vùng giao hiện hữu  
**CTA:** Đăng ký  
**Visual:** Bản đồ chỉ thể hiện cụm công khai; không hiện tọa độ khách hàng.

### AD06 — Food cost và danh sách đặt hàng

**Primary text:** Muốn so sánh giá đúng, danh sách cần thống nhất quy cách, đơn vị tính, sản lượng và tần suất giao. Nhận mẫu file đặt hàng B2B để bộ phận bếp và thu mua dùng chung. Có danh sách rồi, TPS1 có thể rà phương án cung ứng và báo giá theo nhu cầu thực tế trong 24 giờ.

**Headline:** Nhận mẫu file đặt hàng B2B  
**Description:** Chuẩn hóa list trước khi báo giá  
**CTA:** Đăng ký

## 5. SOP speed-to-lead

| Thời điểm | Hành động |
|---|---|
| 0–2 phút | Lead vào Sheet/CRM, gửi xác nhận, phân owner |
| 2–5 phút | Kiểm tra trùng, địa bàn, điểm lead và dữ liệu thiếu |
| 5–15 phút | Gọi lần 1; không nghe thì gửi Zalo có ngữ cảnh |
| Sau 2–4 giờ | Gọi lần 2 và gửi giá trị cụ thể/checklist |
| Cuối ngày | SMS/Zalo ngắn, nhắc cách gửi danh sách |
| Ngày 2, 3, 7 | Follow-up có giá trị; dừng nếu khách từ chối |

### Script gọi 6 bước

1. “Em gọi từ TPS1 về yêu cầu [nhóm hàng] của anh/chị tại [khu vực]. Em xin 3 phút xác nhận để chuẩn bị đúng phương án.”
2. Xác nhận loại đơn vị, vai trò và số suất/sản lượng.
3. Hỏi nhóm hàng, tần suất, khung giờ và địa điểm giao.
4. Hỏi khó khăn lớn nhất: thiếu hàng, quy cách, chứng từ, giá hay đối soát.
5. Xác định ngày cần và người tham gia quyết định.
6. Chốt: gửi danh sách qua Zalo/email hoặc hẹn 15 phút rà nhu cầu; nhắc SLA 24 giờ.

### Zalo khi không bắt máy

“Chào anh/chị [Tên], em là [Sale] từ TPS1. Em vừa gọi để xác nhận yêu cầu [nhóm hàng] tại [khu vực]. Anh/chị gửi giúp file Excel/PDF/ảnh danh sách tại đây; TPS1 sẽ rà quy cách và hoàn thành báo giá trong 24 giờ. Hotline: 089 890 2222.”

## 6. Quy tắc tối ưu

- Không chỉnh 72 giờ đầu trừ lỗi form, policy hoặc tracking.
- Pause ad khi spend ≥2 lần CPL baseline mà 0 lead; hoặc có ≥5 lead nhưng 0 Qualified Lead.
- Scale tối đa 20% mỗi 48 giờ khi có ≥5 Qualified Lead/7 ngày, CPQL đạt baseline và tỷ lệ qualified ≥30%.
- Giữ nếu CPQL bằng 100–130% baseline; giảm 20%/pause nếu trên 130% sau tối thiểu 5 lead.
- Thay creative khi frequency 7 ngày >2,5 và CTR link giảm ≥25% hoặc CPL tăng ≥30%.
- Không mở interest test trước khi broad có ít nhất 20 lead/cụm.
- Remarketing chỉ bật khi tệp warm đủ phân phối; nếu không, chuyển ngân sách về prospecting.

## 7. Lịch organic 4 tuần

| Tuần | Thứ Hai | Thứ Tư | Thứ Sáu |
|---|---|---|---|
| 1 | Video thiếu hàng trước ca | Checklist hồ sơ | Ảnh quy trình nhận list–báo giá |
| 2 | Lỗi sai quy cách | Mẫu file đặt hàng | Video một đầu mối nhiều nhóm |
| 3 | Cách tính tần suất giao | Checklist nghiệm thu | Bằng chứng kho/tuyến giao công khai |
| 4 | 5 câu hỏi khi đổi NCC | Mẫu brief báo giá | Tổng hợp FAQ từ lead thật |

Mỗi bài có một CTA: `BÁO GIÁ` hoặc link form. Bài thắng theo saves, shares đúng ngành, form opens và Qualified Lead được chuyển sang ads.