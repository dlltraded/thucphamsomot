import fs from "node:fs/promises";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const outDir = "outputs/marketing_10_day_plan";
await fs.mkdir(outDir, { recursive: true });

const wb = Workbook.create();
const overview = wb.worksheets.add("Tổng quan");
const plan = wb.worksheets.add("Kế hoạch 10 ngày");
const content = wb.worksheets.add("Lịch nội dung");
const accounts = wb.worksheets.add("Tệp khách hàng");
const kpi = wb.worksheets.add("KPI & Daily Check-in");
const sources = wb.worksheets.add("Nguồn & giả định");

const navy = "#123B33", green = "#2E7D5B", mint = "#DDF3E8", gold = "#F2B84B";
const pale = "#F4F7F5", red = "#C84C4C", gray = "#5E6B66", white = "#FFFFFF", ink = "#1F2A26";
const titleFmt = { fill: navy, font: { bold: true, color: white, size: 18 }, verticalAlignment: "center" };
const headerFmt = { fill: green, font: { bold: true, color: white }, verticalAlignment: "center", wrapText: true };
const sectionFmt = { fill: mint, font: { bold: true, color: navy, size: 12 }, verticalAlignment: "center" };
const bodyFmt = { font: { color: ink, size: 10 }, verticalAlignment: "top", wrapText: true };

function title(sheet, range, text) {
  range.merge(); range.values = [[text]]; range.format = titleFmt; range.format.rowHeight = 34;
}
function widths(sheet, map) { for (const [col, width] of Object.entries(map)) sheet.getRange(`${col}:${col}`).format.columnWidth = width; }
function common(sheet) { sheet.showGridLines = false; }
function addTable(sheet, range, name) { const t = sheet.tables.add(range, true, name); t.style = "TableStyleMedium4"; t.showBandedRows = true; return t; }

// Tổng quan
common(overview); title(overview, overview.getRange("A1:H1"), "TPS1 — Kế hoạch marketing & bán hàng 10 ngày | 21–30/07/2026");
overview.getRange("A3:H3").merge(); overview.getRange("A3").values = [["QUYẾT ĐỊNH TRỌNG TÂM"]]; overview.getRange("A3:H3").format = sectionFmt;
overview.getRange("A4:H7").merge(); overview.getRange("A4").values = [["Chuyển từ “đã có kênh” sang một sprint tạo pipeline B2B: chọn đúng tài khoản tại Đồng Nai → mở hội thoại → lấy danh sách nhu cầu → báo giá/hẹn khảo sát → ghi nhận lý do thắng/thua. Website, Zalo OA và LinkedIn là hạ tầng; doanh thu đến từ quy trình tiếp cận và phản hồi có kỷ luật."]]; overview.getRange("A4:H7").format = { ...bodyFmt, fill: pale, font: { bold: true, color: navy, size: 12 } };
overview.getRange("A9:H9").merge(); overview.getRange("A9").values = [["ICP: nhà máy/KCN, công ty suất ăn và bếp ăn tập thể tại Đồng Nai  •  Chuyển đổi: hội thoại đủ chuẩn → nhận danh sách → báo giá/hẹn khảo sát  •  Thông điệp: một đầu mối nhiều nhóm hàng, hồ sơ rõ, giao đúng quy cách và lịch"]];
overview.getRange("A9:H9").format = { ...bodyFmt, fill: mint, font: { bold: true, color: navy, size: 10 } };
overview.getRange("A11:H11").values = [["Mục tiêu 10 ngày","Tài khoản mục tiêu","Liên hệ cá nhân hóa","Cuộc trao đổi 2 chiều","Lead đủ chuẩn","Danh sách nhu cầu nhận được","Báo giá / khảo sát","Khách thử / cơ hội rõ"]];
overview.getRange("A11:H11").format = headerFmt;
overview.getRange("A12:H12").values = [["Mục tiêu cơ sở",60,80,20,10,6,5,2]];
overview.getRange("A13:H13").values = [["Ngưỡng tối thiểu",40,50,12,6,3,3,1]];
overview.getRange("A12:H13").format = bodyFmt;
overview.getRange("B12:H13").format.numberFormat = "#,##0";
overview.getRange("A15:H15").merge(); overview.getRange("A15").values = [["NGUYÊN TẮC VẬN HÀNH"]]; overview.getRange("A15:H15").format = sectionFmt;
overview.getRange("A16:H20").values = [
  ["1", "Một thị trường trước", "Ưu tiên Đồng Nai: Biên Hòa/Amata → Long Thành/Nhơn Trạch → Trảng Bom/Hố Nai/Vĩnh Cửu.", "", "2", "Một offer trước", "“Gửi danh sách nhu cầu — nhận phương án nguồn hàng, lịch giao và báo giá phù hợp.”", ""],
  ["3", "Tốc độ phản hồi", "Lead nóng: xác nhận ≤5 phút, gọi ≤15 phút trong giờ làm việc; chưa bắt máy thì chuyển Zalo.", "", "4", "Bằng chứng trước quảng cáo", "Dùng hồ sơ, chứng nhận, khách hàng hiện hữu và ảnh vận hành; không dùng claim chưa kiểm chứng.", ""],
  ["5", "Không scale mù", "Không tăng ngân sách nếu chưa ghi được lead đủ chuẩn, nguồn lead và kết quả follow-up.", "", "6", "Mỗi ngày phải học", "Chốt 17:00: ghi câu hỏi/objection, ngành, khu vực, nhu cầu và bước tiếp theo.", ""],
  ["7", "Founder-led sales", "10 ngày đầu ưu tiên người hiểu vận hành trực tiếp tham gia gọi/khảo sát để học nhanh.", "", "8", "Kênh có vai trò rõ", "LinkedIn tìm người/uy tín; Zalo chăm sóc; website tạo tin cậy và nhận RFQ; ads chỉ khuếch đại.", ""],
  ["9", "Đầu ra quan trọng", "Danh sách tài khoản + log tiếp cận + nhu cầu thật + báo giá + lý do phản hồi, không phải số bài đăng.", "", "10", "Cổng quyết định ngày 10", "Scale, sửa offer hay đổi phân khúc dựa trên tỷ lệ phản hồi và lead đủ chuẩn.", ""]
];
overview.getRange("A16:H20").format = bodyFmt;
widths(overview,{A:12,B:24,C:34,D:18,E:14,F:24,G:34,H:18}); overview.freezePanes.freezeRows(1);

// Plan 10 days
common(plan); title(plan, plan.getRange("A1:M1"), "Kế hoạch hành động 10 ngày — người làm, đầu ra và tiêu chí hoàn thành");
const planHeaders = ["Ngày","Trọng tâm","Việc phải làm","Kênh/Công cụ","Người phụ trách","Phối hợp","Đầu ra cuối ngày","KPI mục tiêu","Gate / tiêu chí xong","Ưu tiên","Trạng thái","Kết quả thực tế","Ghi chú / bài học"];
const planRows = [
 [new Date("2026-07-21"),"Khóa đo lường & offer","Làm sạch lead test; thống nhất 6 trường bắt buộc: nguồn, phân khúc, khu vực, nhu cầu, trạng thái, bước tiếp theo. Kiểm tra form website/Zalo đổ dữ liệu và UTM. Chốt 1 CTA dùng chung.","Website + Zalo + Sheet/Admin","Growth/RevOps","Founder + Tech","Bảng lead sạch; mã nguồn chuẩn; SLA; CTA chuẩn","100% lead mới có nguồn & trạng thái","Gửi thử 3 lead từ 3 kênh, nhận đủ dữ liệu","P0","Chưa bắt đầu","",""],
 [new Date("2026-07-22"),"Xây tệp tài khoản mục tiêu","Lập 60 tài khoản: 25 nhà máy/KCN, 15 công ty suất ăn/bếp tập thể, 10 trường/bệnh viện, 10 nhà hàng/khách sạn. Tìm người mua hàng/vận hành/bếp trưởng và số/Zalo/LinkedIn công khai.","LinkedIn + Google Maps + hồ sơ cũ","Research/SDR","Founder","60 account; ≥40 contact; phân tầng A/B/C","60 account; 40 contact","Mỗi record có lý do fit và tuyến giao","P0","Chưa bắt đầu","",""],
 [new Date("2026-07-23"),"Đóng gói bằng chứng bán hàng","Tạo bộ sales kit 1 trang: nhóm hàng, khu vực giao, quy trình báo giá, chứng nhận, khách hàng tiêu biểu, hotline/Zalo. Tạo checklist 8 tiêu chí chọn NCC và mẫu danh sách nhu cầu.","Website + PDF/ảnh + Zalo","Content/Design","Ops + Founder","01 one-pager; 01 checklist; 01 mẫu nhu cầu","3 tài sản hoàn chỉnh","Mọi claim có tài liệu/ảnh đối chiếu","P0","Chưa bắt đầu","",""],
 [new Date("2026-07-24"),"Outbound wave 1","Cá nhân hóa 30 liên hệ Tier A/B. Mở bằng vấn đề vận hành và khu vực giao; CTA xin danh sách nhu cầu hoặc lịch gọi 10 phút. Không gửi bảng giá đại trà.","LinkedIn + Zalo + Điện thoại","SDR/Sales","Founder","30 liên hệ; log phản hồi & objection","30 tiếp cận; 6 phản hồi; 3 cuộc gọi","100% có follow-up date","P0","Chưa bắt đầu","",""],
 [new Date("2026-07-25"),"Nội dung chứng minh năng lực","Đăng case/proof: cách TPS1 xử lý đúng quy cách, lịch giao, hồ sơ và sự cố. Cắt thành LinkedIn post, Zalo OA post và bài website ngắn; dẫn về form báo giá.","LinkedIn + Zalo OA + Website","Content","Ops + Founder","01 content pillar + 3 phiên bản kênh","3 bài; 5 hội thoại mới","Không nêu tên/logo nếu chưa có quyền","P1","Chưa bắt đầu","",""],
 [new Date("2026-07-26"),"Google Search hygiene","Rà tracking form/call; tách Brand và Core B2B; sửa RSA ad strength; bổ sung negative mua lẻ/việc làm/định nghĩa; map keyword theo landing địa phương. Giữ ngân sách thấp đến khi có conversion thật.","Google Ads + Website","Performance","Tech + Sales","Tracking test; negative list; RSA mới","3 conversion test; 0 lỗi tracking","Không tăng ngân sách nếu chưa đo lead chuẩn","P1","Chưa bắt đầu","",""],
 [new Date("2026-07-27"),"Outbound wave 2 + follow-up","Tiếp cận 30 account còn lại; follow-up wave 1 bằng checklist hoặc mẫu nhu cầu. Gọi các phản hồi có fit; cập nhật nhu cầu, quy mô, tuyến, thời hạn.","LinkedIn + Zalo + Điện thoại","SDR/Sales","Founder","50 liên hệ lũy kế; hồ sơ lead đầy đủ","20 tiếp cận mới; 5 phản hồi; 4 call","Lead đủ chuẩn có bước tiếp theo & ngày hẹn","P0","Chưa bắt đầu","",""],
 [new Date("2026-07-28"),"Báo giá & khảo sát","Ưu tiên tốc độ: lập báo giá theo danh sách thực; hẹn khảo sát/trao đổi vận hành. Chuẩn hóa 3 mẫu trả lời objection: giá, hồ sơ, tuyến giao/đổi hàng.","Admin báo giá + Zalo + Phone","Sales/Founder","Ops + Mua hàng","≥3 báo giá/khảo sát; objection library","3 báo giá; 2 lịch hẹn","Mỗi báo giá có next step trong 24h","P0","Chưa bắt đầu","",""],
 [new Date("2026-07-29"),"Tối ưu theo dữ liệu thật","Phân tích theo phân khúc/khu vực/thông điệp: tỷ lệ phản hồi, lead chuẩn, báo giá. Dừng thông điệp yếu; viết lại hook/CTA; chọn 1 nội dung và 1 nhóm account để nhân đôi.","KPI sheet + Ads + CRM/Sheet","Growth Lead","Sales + Content","Bảng learnings; quyết định keep/kill/test","100% hoạt động có kết quả; 3 quyết định","Không tối ưu theo like/impression đơn lẻ","P0","Chưa bắt đầu","",""],
 [new Date("2026-07-30"),"Review & sprint kế tiếp","Họp 60 phút: xem pipeline, SLA, chất lượng lead, lý do mất. Chọn: scale outbound, tăng ads có kiểm soát, hoặc sửa offer/ICP. Lập backlog 14 ngày tiếp theo và owner.","KPI + Pipeline review","Founder/Growth","Toàn team","Decision memo; backlog 14 ngày; budget gate","2 cơ hội rõ; 1 khách thử mục tiêu","Quyết định dựa lead đủ chuẩn & báo giá, không vanity","P0","Chưa bắt đầu","",""]
];
plan.getRange("A3:M3").values=[planHeaders]; plan.getRange("A3:M3").format=headerFmt;
plan.getRange(`A4:M${3+planRows.length}`).values=planRows; plan.getRange(`A4:M${3+planRows.length}`).format=bodyFmt;
plan.getRange("A4:A13").format.numberFormat="ddd, dd/mm";
plan.getRange("J4:J13").dataValidation={rule:{type:"list",values:["P0","P1","P2"]}};
plan.getRange("K4:K13").dataValidation={rule:{type:"list",values:["Chưa bắt đầu","Đang làm","Chờ","Hoàn thành"]}};
plan.getRange("K4:K13").conditionalFormats.add("containsText",{text:"Hoàn thành",format:{fill:"#C6EFCE",font:{color:"#006100",bold:true}}});
plan.getRange("K4:K13").conditionalFormats.add("containsText",{text:"Chờ",format:{fill:"#FCE8E6",font:{color:red,bold:true}}});
addTable(plan,"A3:M13","Plan10Days"); plan.freezePanes.freezeRows(3); widths(plan,{A:13,B:25,C:58,D:24,E:19,F:19,G:38,H:27,I:38,J:10,K:17,L:22,M:38});

// Content calendar
common(content); title(content, content.getRange("A1:K1"), "Lịch nội dung đa kênh — 10 ngày (ưu tiên tạo hội thoại, không chạy theo số lượng)");
const ch=["Ngày","Chủ đề / góc tiếp cận","Đối tượng","Định dạng gốc","LinkedIn","Zalo OA","Website","CTA","Bằng chứng cần có","Owner","Trạng thái"];
const cr=[
 [new Date("2026-07-23"),"Checklist chọn nhà cung cấp thực phẩm B2B","Mua hàng / vận hành","Checklist 8 điểm","Carousel 6–8 slide","Bài ngắn + file","Bài kiến thức","Gửi danh sách nhu cầu để đối chiếu","Chứng nhận/quy trình thực tế","Content","Chưa bắt đầu"],
 [new Date("2026-07-25"),"Một đầu mối nhiều nhóm hàng giúp bếp giảm việc gì?","Bếp trưởng / quản lý suất ăn","Case/problem-solution","Post founder POV","Ảnh + 5 ý","Bài SEO ngắn","Nhắn khu vực + số suất/ngày","Danh mục 5.195 SKU là dữ liệu thô, chỉ dùng nhóm hàng đã xác nhận cung ứng","Founder + Content","Chưa bắt đầu"],
 [new Date("2026-07-27"),"Trước khi hỏi giá, cần chốt tuyến và quy cách","Mua hàng / bếp","Mẫu danh sách nhu cầu","Document post","Bài OA + link form","Landing local/RFQ","Nhận mẫu danh sách đặt hàng","Tuyến giao và quy cách thực tế","Ops + Content","Chưa bắt đầu"],
 [new Date("2026-07-29"),"Hồ sơ nhà cung cấp: bộ phận mua hàng cần gì?","Procurement / QA","Guide + proof","Carousel","Post proof","Bài kiến thức","Nhận checklist hồ sơ","ATVSTP, ISO 22000:2018, HACCP — kiểm tra hiệu lực trước khi đăng","QA/Ops","Chưa bắt đầu"],
 [new Date("2026-07-30"),"Câu hỏi thật từ khách hàng tuần này","Nhà máy/KCN","FAQ / objection","Founder recap","FAQ ngắn","Cập nhật FAQ","Đặt lịch 10 phút","Log cuộc gọi, ẩn thông tin nhạy cảm","Founder","Chưa bắt đầu"]
];
content.getRange("A3:K3").values=[ch]; content.getRange("A3:K3").format=headerFmt; content.getRange("A4:K8").values=cr; content.getRange("A4:K8").format=bodyFmt; content.getRange("A4:A8").format.numberFormat="dd/mm"; content.getRange("K4:K8").dataValidation={rule:{type:"list",values:["Chưa bắt đầu","Đang làm","Duyệt","Đã đăng"]}}; addTable(content,"A3:K8","ContentCalendar"); content.freezePanes.freezeRows(3); widths(content,{A:12,B:38,C:26,D:22,E:25,F:23,G:22,H:32,I:50,J:20,K:17});

// Target accounts
common(accounts); title(accounts, accounts.getRange("A1:N1"), "Tệp khách hàng mục tiêu — cấu trúc để team điền và ưu tiên");
accounts.getRange("A3:N3").values=[["Tier","Phân khúc","Khu vực","Tên doanh nghiệp","Website/Maps","Người liên hệ","Vai trò","LinkedIn","Điện thoại/Zalo","Nhu cầu giả định","Lý do fit","Điểm fit","Trạng thái","Bước tiếp theo"]]; accounts.getRange("A3:N3").format=headerFmt;
const seed=[
 ["A","Nhà máy / KCN","Biên Hòa / Amata","","","","Mua hàng / Hành chính / Bếp","","","Nguồn hàng định kỳ, nhiều nhóm","Tuyến gần + nhu cầu đều",90,"Chưa tiếp cận",""] ,
 ["A","Công ty suất ăn","Đồng Nai","","","","Giám đốc / Thu mua / Điều hành","","","Bổ sung nguồn cung, xử lý thiếu hàng","Có tệp bếp đang vận hành",90,"Chưa tiếp cận",""] ,
 ["A","Bếp ăn tập thể","Long Thành / Nhơn Trạch","","","","Quản lý bếp / Thu mua","","","Rau củ, thịt cá, đông lạnh định kỳ","Tuyến mục tiêu + pain rõ",85,"Chưa tiếp cận",""] ,
 ["B","Trường học / Bệnh viện","Biên Hòa","","","","Hành chính / Dinh dưỡng / Thu mua","","","Hồ sơ, ATVSTP, giao đúng giờ","Proof/certification phù hợp",75,"Chưa tiếp cận",""] ,
 ["B","Nhà hàng / Khách sạn","Biên Hòa / TP.HCM gần tuyến","","","","Bếp trưởng / Owner / Thu mua","","","Rau củ, thịt cá, hàng đông lạnh","Tần suất cao nhưng đơn nhỏ hơn",65,"Chưa tiếp cận",""]
];
accounts.getRange("A4:N8").values=seed; accounts.getRange("A4:N8").format=bodyFmt;
accounts.getRange("A4:A63").dataValidation={rule:{type:"list",values:["A","B","C"]}}; accounts.getRange("M4:M63").dataValidation={rule:{type:"list",values:["Chưa tiếp cận","Đã nhắn","Đã phản hồi","Đã gọi","Lead đủ chuẩn","Đã báo giá","Không phù hợp"]}};
accounts.getRange("L4:L63").format.numberFormat="0"; accounts.getRange("L4:L63").conditionalFormats.add("colorScale",{colors:["#F8D7DA","#FFF1B8","#C6EFCE"],thresholds:["min","50%","max"]});
addTable(accounts,"A3:N63","TargetAccounts"); accounts.freezePanes.freezeRows(3); widths(accounts,{A:8,B:24,C:24,D:30,E:30,F:23,G:27,H:28,I:22,J:35,K:34,L:11,M:19,N:30});

// KPI tracker
common(kpi); title(kpi, kpi.getRange("A1:P1"), "KPI & Daily Check-in — đo pipeline, không đo vanity");
kpi.getRange("A3:P3").values=[["Ngày","Account mới","Contact tìm được","Tiếp cận","Phản hồi 2 chiều","Cuộc gọi","Lead đủ chuẩn","Danh sách nhu cầu","Báo giá/khảo sát","Khách thử","Chi phí ads","Phút phản hồi TB","Tỷ lệ phản hồi","Tỷ lệ đủ chuẩn","CPL đủ chuẩn","Bài học / quyết định"]]; kpi.getRange("A3:P3").format=headerFmt;
const dates=Array.from({length:10},(_,i)=>[new Date(2026,6,21+i),0,0,0,0,0,0,0,0,0,0,0,"","","",""]);
kpi.getRange("A4:P13").values=dates; kpi.getRange("A4:P13").format=bodyFmt; kpi.getRange("A4:A13").format.numberFormat="dd/mm";
for(let r=4;r<=13;r++){
  kpi.getRange(`M${r}`).formulas=[[`=IFERROR(E${r}/D${r},0)`]];
  kpi.getRange(`N${r}`).formulas=[[`=IFERROR(G${r}/E${r},0)`]];
  kpi.getRange(`O${r}`).formulas=[[`=IFERROR(K${r}/G${r},0)`]];
}
kpi.getRange("M4:N13").format.numberFormat="0.0%"; kpi.getRange("K4:K13").format.numberFormat='#,##0 "đ"'; kpi.getRange("O4:O13").format.numberFormat='#,##0 "đ"';
kpi.getRange("A15:P15").values=[["TỔNG / BÌNH QUÂN","=SUM(B4:B13)","=SUM(C4:C13)","=SUM(D4:D13)","=SUM(E4:E13)","=SUM(F4:F13)","=SUM(G4:G13)","=SUM(H4:H13)","=SUM(I4:I13)","=SUM(J4:J13)","=SUM(K4:K13)","=IFERROR(AVERAGEIF(L4:L13,\">0\",L4:L13),0)","=IFERROR(E15/D15,0)","=IFERROR(G15/E15,0)","=IFERROR(K15/G15,0)",""]];
// Re-apply totals row formulas explicitly because values beginning with = are text in this API.
kpi.getRange("B15:O15").formulas=[["=SUM(B4:B13)","=SUM(C4:C13)","=SUM(D4:D13)","=SUM(E4:E13)","=SUM(F4:F13)","=SUM(G4:G13)","=SUM(H4:H13)","=SUM(I4:I13)","=SUM(J4:J13)","=SUM(K4:K13)","=IFERROR(AVERAGEIF(L4:L13,\">0\",L4:L13),0)","=IFERROR(E15/D15,0)","=IFERROR(G15/E15,0)","=IFERROR(K15/G15,0)"]];
kpi.getRange("A15:P15").format={...sectionFmt,fill:gold}; kpi.getRange("M15:N15").format.numberFormat="0.0%"; kpi.getRange("K15:K15").format.numberFormat='#,##0 "đ"'; kpi.getRange("O15:O15").format.numberFormat='#,##0 "đ"';
addTable(kpi,"A3:P13","DailyKPI"); kpi.freezePanes.freezeRows(3); widths(kpi,{A:11,B:13,C:16,D:12,E:17,F:12,G:17,H:18,I:19,J:12,K:16,L:18,M:16,N:17,O:17,P:45});

// Sources and assumptions
common(sources); title(sources, sources.getRange("A1:F1"), "Nguồn đã quét, phát hiện và giả định cần xác nhận");
sources.getRange("A3:F3").values=[["Nguồn","Ngày file / phạm vi","Điều xác nhận","Cách dùng trong kế hoạch","Hạn chế","Mức tin cậy"]]; sources.getRange("A3:F3").format=headerFmt;
const sr=[
 ["Profile TPS1ĐN-2025.pptx","Hồ sơ năng lực 2025","Nhóm khách: trường/bệnh viện, công ty suất ăn, bếp tập thể, nhà hàng/khách sạn; proof: khách hàng, ATVSTP, ISO 22000:2018, HACCP","Định vị, ICP, proof kit","Cần kiểm tra quyền dùng logo và hiệu lực chứng nhận trước khi công khai","Cao cho định hướng; cần QA claim"],
 ["DanhSachSanPham_KV...xlsx","23/06/2026; 5.195 dòng","Danh mục rộng nhiều nhóm hàng","Bằng chứng năng lực danh mục; chọn nhóm hàng theo nhu cầu","Nhiều giá bán bằng 0/tồn âm; không dùng làm bảng giá hoặc claim tồn kho","Trung bình"],
 ["Thực Phẩm Số 1.xlsx","13 lead; đến 20/07/2026","Luồng form có dữ liệu buyer/supplier, nguồn, phân khúc, khu vực","Thiết kế trường CRM và SLA","Có bản ghi test/lặp; không dùng làm baseline chuyển đổi","Thấp cho performance"],
 ["Google Ads export 08/07/2026","84 dòng cấu hình","2 campaign Brand/Core B2B; budget 10k + 150k/ngày; RSA ad strength Poor; negative list còn ngắn","Ngày hygiene và tracking","Không có impressions/clicks/conversions/cost thực tế","Cao cho setup, không đủ đánh giá hiệu quả"],
 ["FB_ADS_PLAYBOOK_30_NGAY.md","Playbook nội bộ","North star, forms, 6 góc ads, speed-to-lead, organic calendar","Tái dùng assets và SOP","Là kế hoạch, chưa phải bằng chứng performance","Cao cho execution"],
 ["SEO plan 03/06/2026","Roadmap local/B2B","Money keywords, landing local, content hub, KPI","Ưu tiên nội dung local và RFQ","Kế hoạch trước đây; cần cập nhật dữ liệu Search Console","Cao cho direction"],
 ["LUỒNG HIỆN TẠI.docx","Luồng website → Sheet → admin","Form RFQ, Google Sheet Leads, admin xem lead/báo giá/đơn/trạng thái","Ngày 1 kiểm tra tracking và vận hành","Mô tả có chỗ trống; cần test end-to-end","Trung bình"],
 ["CustomerProfit (21).xls","File lợi nhuận khách hàng","Có khả năng giúp ưu tiên account giống khách hàng sinh lời","Đưa vào phân tích sprint sau","Không đọc được định dạng .xls trong môi trường hiện tại; chưa dùng để kết luận","Chưa xác minh"]
];
sources.getRange("A4:F11").values=sr; sources.getRange("A4:F11").format=bodyFmt; addTable(sources,"A3:F11","SourceRegister");
sources.getRange("A13:F13").merge(); sources.getRange("A13").values=[["GIẢ ĐỊNH LẬP KẾ HOẠCH (CẦN OWNER XÁC NHẬN TRONG NGÀY 1)"]]; sources.getRange("A13:F13").format=sectionFmt;
sources.getRange("A14:F18").values=[
 ["1","Team nhỏ; Founder/Sales trực tiếp xử lý lead nóng.","3","Mục tiêu 10 ngày là học nhanh và tạo pipeline, chưa phải tối đa reach.","5","Ngân sách ads giữ theo cấu hình hiện tại hoặc thấp hơn đến khi tracking sạch."],
 ["2","Khu vực giao ưu tiên là Đồng Nai và tuyến lân cận có thể phục vụ ổn định.","4","Có thể dùng một phần proof trong profile sau khi kiểm quyền/hiệu lực.","6","KPI mục tiêu là baseline đề xuất, sẽ hiệu chỉnh sau 3 ngày dữ liệu thật."],
 ["","","","","",""], ["Cổng ngày 3","Nếu <40 contact hoặc proof kit chưa xong: không chạy outbound hàng loạt.","Cổng ngày 7","Nếu phản hồi <10%: sửa list/message trước khi tăng volume.","Cổng ngày 10","Chỉ scale khi có ≥6 lead đủ chuẩn hoặc ≥3 nhu cầu/báo giá có bước tiếp theo."], ["","","","","",""]
]; sources.getRange("A14:F18").format=bodyFmt; widths(sources,{A:32,B:30,C:58,D:50,E:55,F:20}); sources.freezePanes.freezeRows(3);

const checks = await wb.inspect({ kind:"table", range:"Kế hoạch 10 ngày!A1:M13", include:"values,formulas", tableMaxRows:15, tableMaxCols:13, maxChars:7000 });
console.log(checks.ndjson);
const errors = await wb.inspect({ kind:"match", searchTerm:"#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options:{useRegex:true,maxResults:100}, summary:"final formula error scan" });
console.log(errors.ndjson);

for (const [sheetName,file] of [["Tổng quan","preview_overview.png"],["Kế hoạch 10 ngày","preview_plan.png"],["Lịch nội dung","preview_content.png"],["Tệp khách hàng","preview_accounts.png"],["KPI & Daily Check-in","preview_kpi.png"],["Nguồn & giả định","preview_sources.png"]]) {
  const blob = await wb.render({sheetName, autoCrop:"all", scale:0.9, format:"png"});
  await fs.writeFile(`${outDir}/${file}`, new Uint8Array(await blob.arrayBuffer()));
}

const file = await SpreadsheetFile.exportXlsx(wb);
await file.save(`${outDir}/TPS1_Ke_Hoach_Marketing_10_Ngay_2026-07-21.xlsx`);
console.log(`${outDir}/TPS1_Ke_Hoach_Marketing_10_Ngay_2026-07-21.xlsx`);
