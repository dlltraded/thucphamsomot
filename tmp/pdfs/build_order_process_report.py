from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, Image, Flowable
)
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from pathlib import Path
from datetime import date

ROOT = Path(r"D:\thuc_pham_so_mot\thuc_pham_so_mot")
OUT = ROOT / "output" / "pdf" / "BAO_CAO_QUY_TRINH_TIEP_NHAN_VA_XU_LY_DON_HANG_TPS1.pdf"
LOGO = ROOT / "public" / "images" / "tps1-logo-vertical.png"

pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", r"C:\Windows\Fonts\ariali.ttf"))

GREEN = colors.HexColor("#087348")
GREEN_DARK = colors.HexColor("#063C2A")
GREEN_LIGHT = colors.HexColor("#EAF6EF")
MINT = colors.HexColor("#D8F0E2")
ORANGE = colors.HexColor("#FF7417")
INK = colors.HexColor("#17231D")
SLATE = colors.HexColor("#5D6E65")
LINE = colors.HexColor("#D9E6DF")
PALE = colors.HexColor("#F7FAF8")
AMBER = colors.HexColor("#FFF4D6")
RED_PALE = colors.HexColor("#FDECEC")
WHITE = colors.white

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="BodyVN", fontName="Arial", fontSize=9.2, leading=13.6, textColor=INK, spaceAfter=5))
styles.add(ParagraphStyle(name="SmallVN", fontName="Arial", fontSize=7.6, leading=10.5, textColor=SLATE))
styles.add(ParagraphStyle(name="TinyVN", fontName="Arial", fontSize=6.7, leading=9, textColor=SLATE))
styles.add(ParagraphStyle(name="H1VN", fontName="Arial-Bold", fontSize=21, leading=25, textColor=GREEN_DARK, spaceAfter=8))
styles.add(ParagraphStyle(name="H2VN", fontName="Arial-Bold", fontSize=14, leading=18, textColor=GREEN_DARK, spaceBefore=5, spaceAfter=8))
styles.add(ParagraphStyle(name="H3VN", fontName="Arial-Bold", fontSize=10.5, leading=14, textColor=GREEN, spaceBefore=3, spaceAfter=5))
styles.add(ParagraphStyle(name="WhiteTitle", fontName="Arial-Bold", fontSize=19, leading=23, textColor=WHITE, alignment=TA_LEFT))
styles.add(ParagraphStyle(name="WhiteSub", fontName="Arial", fontSize=9, leading=13, textColor=colors.HexColor("#DDEDE5")))
styles.add(ParagraphStyle(name="CardTitle", fontName="Arial-Bold", fontSize=9.5, leading=12, textColor=GREEN_DARK))
styles.add(ParagraphStyle(name="CardBody", fontName="Arial", fontSize=8, leading=11.5, textColor=INK))
styles.add(ParagraphStyle(name="StepNo", fontName="Arial-Bold", fontSize=10, leading=12, textColor=WHITE, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="TableHead", fontName="Arial-Bold", fontSize=7.4, leading=9.5, textColor=GREEN_DARK, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="TableBody", fontName="Arial", fontSize=7.2, leading=9.7, textColor=INK))
styles.add(ParagraphStyle(name="TableBodyCenter", fontName="Arial", fontSize=7.2, leading=9.7, textColor=INK, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="Quote", fontName="Arial-Italic", fontSize=9, leading=13, textColor=GREEN_DARK))

class NumberBadge(Flowable):
    def __init__(self, number, size=8*mm):
        super().__init__()
        self.number = str(number)
        self.width = self.height = size
    def draw(self):
        self.canv.setFillColor(GREEN)
        self.canv.circle(self.width/2, self.height/2, self.width/2, stroke=0, fill=1)
        self.canv.setFillColor(WHITE)
        self.canv.setFont("Arial-Bold", 9)
        self.canv.drawCentredString(self.width/2, self.height/2-3, self.number)

def P(text, style="BodyVN"):
    return Paragraph(text, styles[style])

def bullet(text):
    return Table([[P("•", "CardTitle"), P(text, "BodyVN")]], colWidths=[4*mm, 169*mm], style=[
        ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0), ("TOPPADDING", (0,0), (-1,-1), 0), ("BOTTOMPADDING", (0,0), (-1,-1), 1),
        ("TEXTCOLOR", (0,0), (0,0), GREEN)
    ])

def section_title(number, title, subtitle=None):
    content = [[NumberBadge(number), P(title, "H2VN")]]
    t = Table(content, colWidths=[11*mm, 162*mm], style=[
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("LEFTPADDING", (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0), ("BOTTOMPADDING", (0,0), (-1,-1), 2)
    ])
    elems = [t]
    if subtitle: elems.append(P(subtitle, "SmallVN"))
    elems.append(Spacer(1, 3*mm))
    return elems

def status_chip(text, color, bg):
    return Table([[P(text, "TableBodyCenter")]], style=[
        ("BACKGROUND", (0,0), (-1,-1), bg), ("TEXTCOLOR", (0,0), (-1,-1), color),
        ("BOX", (0,0), (-1,-1), .5, color), ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6), ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4)
    ])

def flow_row(steps):
    cells = []
    widths = []
    for idx, (title, body) in enumerate(steps):
        cells.append(Table([[P(str(idx+1), "StepNo")], [P(title, "CardTitle")], [P(body, "TinyVN")]], colWidths=[28*mm], style=[
            ("BACKGROUND", (0,0), (0,0), GREEN), ("ALIGN", (0,0), (-1,-1), "CENTER"),
            ("BOX", (0,0), (-1,-1), .6, LINE), ("BACKGROUND", (0,1), (-1,-1), WHITE),
            ("TOPPADDING", (0,0), (-1,0), 5), ("BOTTOMPADDING", (0,0), (-1,0), 5),
            ("TOPPADDING", (0,1), (-1,-1), 5), ("BOTTOMPADDING", (0,1), (-1,-1), 5),
        ]))
        widths.append(28*mm)
        if idx < len(steps)-1:
            cells.append(P("→", "H2VN")); widths.append(7*mm)
    return Table([cells], colWidths=widths, style=[("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("ALIGN", (0,0), (-1,-1), "CENTER"), ("LEFTPADDING", (0,0), (-1,-1), 0), ("RIGHTPADDING", (0,0), (-1,-1), 0)])

def card(title, body, accent=GREEN):
    return Table([[P(title, "CardTitle")], [P(body, "CardBody")]], colWidths=[82*mm], style=[
        ("BACKGROUND", (0,0), (-1,-1), WHITE), ("BOX", (0,0), (-1,-1), .7, LINE),
        ("LINEBEFORE", (0,0), (0,-1), 3, accent), ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8), ("LEFTPADDING", (0,0), (-1,-1), 9),
        ("RIGHTPADDING", (0,0), (-1,-1), 9)
    ])

def header_footer(c: canvas.Canvas, doc):
    page = c.getPageNumber()
    if page == 1:
        return
    c.saveState()
    c.setStrokeColor(LINE); c.setLineWidth(.5); c.line(18*mm, 19*mm, 192*mm, 19*mm)
    c.setFont("Arial", 7.2); c.setFillColor(SLATE)
    c.drawString(18*mm, 13*mm, "CÔNG TY TNHH THỰC PHẨM SỐ MỘT - Quy trình tiếp nhận và xử lý đơn hàng")
    c.drawRightString(192*mm, 13*mm, f"Trang {page}")
    c.drawImage(str(LOGO), 18*mm, 280*mm, width=16*mm, height=11.2*mm, preserveAspectRatio=True, mask="auto")
    c.setFont("Arial-Bold", 8); c.setFillColor(GREEN_DARK)
    c.drawRightString(192*mm, 284*mm, "WEBSITE + ZALO MINI APP + HỆ THỐNG QUẢN LÝ")
    c.restoreState()

doc = BaseDocTemplate(str(OUT), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=31*mm, bottomMargin=23*mm,
                      title="Báo cáo quy trình tiếp nhận và xử lý đơn hàng TPS1", author="Công ty TNHH Thực Phẩm Số Một")
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
doc.addPageTemplates(PageTemplate(id="main", frames=[frame], onPage=header_footer))

story = []

# Cover
story.append(Spacer(1, 12*mm))
story.append(Image(str(LOGO), width=45*mm, height=31.6*mm))
story.append(Spacer(1, 12*mm))
cover = Table([
    [P("BÁO CÁO QUY TRÌNH", "WhiteSub")],
    [P("TIẾP NHẬN VÀ XỬ LÝ ĐƠN HÀNG", "WhiteTitle")],
    [P("Qua Website thucphamsomot.vn và Zalo Mini App", "WhiteSub")],
], colWidths=[174*mm], style=[
    ("BACKGROUND", (0,0), (-1,-1), GREEN_DARK), ("TOPPADDING", (0,0), (-1,0), 14),
    ("BOTTOMPADDING", (0,0), (-1,0), 2), ("TOPPADDING", (0,1), (-1,1), 4),
    ("BOTTOMPADDING", (0,1), (-1,1), 5), ("TOPPADDING", (0,2), (-1,2), 3),
    ("BOTTOMPADDING", (0,2), (-1,2), 15), ("LEFTPADDING", (0,0), (-1,-1), 16),
    ("RIGHTPADDING", (0,0), (-1,-1), 16), ("LINEBELOW", (0,2), (-1,2), 4, ORANGE)
])
story.append(cover)
story.append(Spacer(1, 13*mm))
story.append(P("MỤC TIÊU HỆ THỐNG", "H3VN"))
story.append(P("Xây dựng một luồng đặt hàng B2B thống nhất: khách hàng có thể gửi nhu cầu từ Website hoặc Zalo Mini App; mọi đơn đều tập trung về một bảng order trung tâm để sale phân loại khách, xác nhận quy cách, chốt đơn giá cuối cùng, tạo chứng từ PDF và đồng bộ lại cho khách trên tất cả nền tảng.", "BodyVN"))
story.append(Spacer(1, 6*mm))
summary_cards = Table([[card("MỘT NGUỒN DỮ LIỆU", "Website, Zalo Mini App và Admin cùng sử dụng đơn hàng trung tâm trên Supabase."), card("GIÁ DO SALE XÁC NHẬN", "Giá lúc khách đặt chỉ là tạm tính; giá cuối cùng được khóa sau khi sale kiểm tra.")],
                       [card("ĐỒNG BỘ ĐA NỀN TẢNG", "Trạng thái, sản phẩm, giá, số lượng và quy cách được trả về Website và Mini App."), card("CHỨNG TỪ CÓ PHIÊN BẢN", "Mỗi lần chốt lại tạo revision mới và PDF xác nhận để gửi khách.", ORANGE)]], colWidths=[86*mm,86*mm], style=[("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),2),("RIGHTPADDING",(0,0),(-1,-1),2),("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3)])
story.append(summary_cards)
story.append(Spacer(1, 18*mm))
story.append(P(f"Ngày báo cáo: {date.today().strftime('%d/%m/%Y')}", "SmallVN"))
story.append(P("Đơn vị thực hiện: Công ty TNHH Thực Phẩm Số Một", "SmallVN"))
story.append(PageBreak())

# Executive summary
story += section_title(1, "Tóm tắt điều hành", "Những nguyên tắc cốt lõi của quy trình mới")
story.append(P("Quy trình được thiết kế cho đặc thù khách hàng doanh nghiệp: giá thực tế phụ thuộc nhóm khách, sản lượng, quy cách sơ chế/đóng gói và thỏa thuận công nợ. Vì vậy hệ thống không coi giá tại thời điểm đặt là giá cuối cùng.", "BodyVN"))
for text in [
    "Khách chưa xác thực và khách đã xác thực đều phải qua bước sale xác nhận đơn hàng.",
    "VIP0 không đồng nghĩa với tài khoản lỗi; đây có thể là khách hợp lệ nhưng chưa đủ điều kiện hưởng chiết khấu.",
    "Sale có thể chọn hạng khách, sửa số lượng, chỉnh giá từng dòng, ghi quy cách, thêm hoặc xóa sản phẩm trước khi chốt.",
    "Sau khi chốt, đơn chuyển từ <b>giá tạm tính</b> sang <b>giá đã xác nhận</b>, đồng thời tạo PDF xác nhận có logo TPS1.",
    "COD trong Zalo Checkout SDK chỉ là bước kỹ thuật xác nhận gửi đơn phục vụ luồng xét duyệt Mini App; không được ghi nhận là đã thanh toán.",
]: story.append(bullet(text))
story.append(Spacer(1, 4*mm))
story.append(Table([[P("KẾT QUẢ QUẢN TRỊ", "CardTitle"), P("Sếp và bộ phận vận hành theo dõi được toàn bộ vòng đời đơn hàng trên một màn hình; sale có quyền chốt giá có kiểm soát; khách luôn nhìn thấy bản đơn cuối giống nhau trên Website, Zalo Mini App và PDF.", "CardBody")]], colWidths=[42*mm,132*mm], style=[("BACKGROUND",(0,0),(-1,-1),GREEN_LIGHT),("BOX",(0,0),(-1,-1),.8,GREEN),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("LEFTPADDING",(0,0),(-1,-1),9),("RIGHTPADDING",(0,0),(-1,-1),9),("TOPPADDING",(0,0),(-1,-1),9),("BOTTOMPADDING",(0,0),(-1,-1),9)]))
story.append(Spacer(1, 8*mm))

story += section_title(2, "Kiến trúc luồng đơn hàng trung tâm")
story.append(flow_row([
    ("Kênh tiếp nhận", "Website hoặc Zalo Mini App"),
    ("Tài khoản", "Đăng ký/đăng nhập khách hàng"),
    ("Order trung tâm", "Lưu đơn và snapshot tạm tính"),
    ("Sale xử lý", "Phân loại, chỉnh hàng, chốt giá"),
    ("Đồng bộ", "Website, Mini App, PDF, trạng thái"),
]))
story.append(Spacer(1, 6*mm))
arch = [
    [P("Thành phần", "TableHead"), P("Vai trò", "TableHead"), P("Dữ liệu chính", "TableHead")],
    [P("Website", "TableBody"), P("Kênh tra cứu sản phẩm, đăng ký/đăng nhập, đặt hàng và theo dõi đơn.", "TableBody"), P("Giỏ hàng, địa chỉ giao, đơn tạm tính, đơn đã chốt, PDF.", "TableBody")],
    [P("Zalo Mini App", "TableBody"), P("Kênh mua hàng thuận tiện trong Zalo; gọi Checkout SDK COD để hoàn tất bước gửi đơn.", "TableBody"), P("Sản phẩm, tài khoản, địa chỉ, đơn và trạng thái giống Website.", "TableBody")],
    [P("Supabase", "TableBody"), P("Nguồn dữ liệu trung tâm và lưu lịch sử xử lý.", "TableBody"), P("Khách hàng, hạng khách, orders, order_items, order_history, order_documents.", "TableBody")],
    [P("TPS1 Admin", "TableBody"), P("Bàn điều hành của sale và quản lý.", "TableBody"), P("Phân loại khách, giá, quy cách, sản phẩm, trạng thái, thanh toán, PDF.", "TableBody")],
]
story.append(Table(arch, colWidths=[31*mm,70*mm,73*mm], repeatRows=1, style=[("BACKGROUND",(0,0),(-1,0),MINT),("GRID",(0,0),(-1,-1),.5,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE,PALE]),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)]))
story.append(PageBreak())

# Intake flows
story += section_title(3, "Quy trình tiếp nhận đơn hàng qua Website")
story.append(flow_row([
    ("Xem sản phẩm", "Khách chưa đăng nhập vẫn xem và chọn hàng"),
    ("Đăng nhập", "Cổng Đối Tác VIP; khách mới đăng ký VIP0"),
    ("Giao hàng", "Chọn địa chỉ mặc định hoặc thêm địa chỉ khác"),
    ("Gửi đơn", "Tạo order trạng thái chờ xác nhận"),
    ("Theo dõi", "Khách xem tiến độ và tải PDF khi sale chốt"),
]))
story.append(Spacer(1, 5*mm))
for text in [
    "Nếu chưa đăng nhập, sản phẩm đi vào luồng yêu cầu báo giá và có hướng dẫn đăng nhập Cổng Đối Tác VIP hoặc liên hệ Hotline/Zalo 089.890.2222 để được cấp tài khoản.",
    "Sau khi đăng nhập, khách có thể đặt hàng, sử dụng thông tin giao hàng mặc định hoặc thêm địa chỉ nhận hàng khác.",
    "Hệ thống tạo mã đơn duy nhất, lưu nguồn <b>Website</b> và tổng tạm tính tại thời điểm đặt.",
    "Khách thấy thông báo đang chờ sale kiểm tra phân loại và chốt giá; chưa coi là đơn giá cuối cùng.",
]: story.append(bullet(text))
story.append(Spacer(1, 5*mm))

story += section_title(4, "Quy trình tiếp nhận đơn hàng qua Zalo Mini App")
story.append(flow_row([
    ("Quét QR", "Mở Mini App và xem catalog"),
    ("Chọn hàng", "Thêm sản phẩm theo nhu cầu"),
    ("Tài khoản", "Đăng ký VIP0 hoặc đăng nhập"),
    ("Xác nhận COD", "Checkout SDK xác nhận gửi đơn"),
    ("Chờ sale", "Đơn vẫn pending và giá provisional"),
]))
story.append(Spacer(1, 5*mm))
cod_note = Table([[P("LƯU Ý QUAN TRỌNG", "CardTitle"), P("COD trên Zalo không phải là thu tiền hoặc xác nhận đã thanh toán. Đây là bước kỹ thuật cần duy trì để hoàn thành luồng order theo yêu cầu xét duyệt Zalo. Đơn vẫn mang trạng thái <b>chờ xác nhận</b> và <b>chờ xử lý thanh toán/công nợ</b>.", "CardBody")]], colWidths=[43*mm,131*mm], style=[("BACKGROUND",(0,0),(-1,-1),AMBER),("BOX",(0,0),(-1,-1),.7,ORANGE),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8)] )
story.append(cod_note)
story.append(Spacer(1, 5*mm))
story.append(P("Ngay cả khi khách đóng màn hình COD hoặc Checkout SDK không mở được, order đã được ghi an toàn vào Supabase trước đó và vẫn được chuyển cho sale xử lý; không làm mất đơn và không tự đổi trạng thái sang đã thanh toán.", "BodyVN"))
story.append(PageBreak())

# Sale process
story += section_title(5, "Quy trình sale tiếp nhận và chốt đơn cuối cùng", "Bàn chốt đơn là điểm kiểm soát nghiệp vụ quan trọng nhất")
sale_steps = [
    ["1", "Mở đơn mới", "Sale vào Quản lý đơn hàng, lọc trạng thái Chờ xác nhận và mở chi tiết bằng nút hình con mắt."],
    ["2", "Liên hệ khách", "Xác minh người nhận, địa chỉ, thời gian giao, nhu cầu thực tế và điều kiện công nợ."],
    ["3", "Phân loại khách", "Chọn VIP0, VIP1, VIP2 hoặc VIP3. VIP0 vẫn có thể là khách hợp lệ nhưng không có chiết khấu."],
    ["4", "Hoàn thiện dòng hàng", "Sửa số lượng; thêm/xóa sản phẩm; ghi quy cách riêng như cắt lát, kích cỡ, đóng gói."],
    ["5", "Chốt chính sách giá", "Áp giá theo hạng, chiết khấu riêng toàn đơn hoặc nhập giá thủ công cho từng sản phẩm."],
    ["6", "Kiểm tra tổng", "Xem giá trị gốc, giảm/điều chỉnh, phí giao hàng và tổng cuối trước khi xác nhận."],
    ["7", "Xác nhận đơn", "Hệ thống khóa một revision mới, chuyển đơn sang Đã xác nhận và lưu lịch sử người thực hiện."],
    ["8", "Phát hành PDF", "Tạo phiếu xác nhận có logo, mã đơn, revision, sản phẩm, quy cách, giá, tổng tiền và phần ký tên."],
]
sale_table = [[P("Bước", "TableHead"), P("Thao tác", "TableHead"), P("Nội dung kiểm soát", "TableHead")]] + [[P(a,"TableBodyCenter"),P(b,"TableBody"),P(c,"TableBody")] for a,b,c in sale_steps]
story.append(Table(sale_table, colWidths=[13*mm,42*mm,119*mm], repeatRows=1, style=[("BACKGROUND",(0,0),(-1,0),MINT),("GRID",(0,0),(-1,-1),.5,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE,PALE]),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)]))
story.append(Spacer(1, 7*mm))

story += section_title(6, "Ba cơ chế chốt giá")
pricing = [
    [P("Cơ chế", "TableHead"), P("Cách tính", "TableHead"), P("Trường hợp sử dụng", "TableHead")],
    [P("Theo hạng khách", "TableBody"), P("Hệ thống lấy phần trăm chiết khấu của VIP0/VIP1/VIP2/VIP3 và áp lên giá gốc từng dòng.", "TableBody"), P("Khách đã có chính sách giá ổn định.", "TableBody")],
    [P("Chiết khấu riêng toàn đơn", "TableBody"), P("Sale nhập một tỷ lệ chiết khấu riêng cho toàn bộ hàng hóa trong đơn.", "TableBody"), P("Đơn đặc biệt, chương trình hỗ trợ hoặc thương lượng theo tổng lượng.", "TableBody")],
    [P("Giá thủ công từng sản phẩm", "TableBody"), P("Sale nhập đơn giá cuối cho từng dòng; hệ thống tự tính thành tiền và mức điều chỉnh.", "TableBody"), P("Giá phụ thuộc quy cách, chất lượng, khối lượng, sơ chế hoặc thỏa thuận riêng.", "TableBody")],
]
story.append(Table(pricing, colWidths=[43*mm,76*mm,55*mm], repeatRows=1, style=[("BACKGROUND",(0,0),(-1,0),MINT),("GRID",(0,0),(-1,-1),.5,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE,PALE]),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)]))
story.append(PageBreak())

# States and sync
story += section_title(7, "Trạng thái và nguyên tắc kiểm soát")
state_data = [
    [P("Nhóm trạng thái", "TableHead"), P("Giá trị", "TableHead"), P("Ý nghĩa vận hành", "TableHead")],
    [P("Giá", "TableBody"), P("Provisional", "TableBodyCenter"), P("Giá tạm tính; sale chưa chốt. Không được chuyển sang các bước xử lý tiếp theo hoặc ghi nhận đã thanh toán.", "TableBody")],
    [P("Giá", "TableBody"), P("Finalized", "TableBodyCenter"), P("Đã xác nhận khách, danh sách hàng, quy cách và giá cuối; có revision và có thể phát hành PDF.", "TableBody")],
    [P("Xử lý đơn", "TableBody"), P("Pending → Confirmed → Preparing → Shipping → Completed", "TableBodyCenter"), P("Chuỗi tiến độ từ chờ xác nhận đến hoàn thành. Có thể Canceled khi đơn bị hủy.", "TableBody")],
    [P("Thanh toán", "TableBody"), P("Pending / COD / Paid / Failed / Refunded", "TableBodyCenter"), P("Độc lập với bước giá. Với khách công nợ, có thể giữ Pending/COD đến khi đối soát; không tự động coi COD là đã trả tiền.", "TableBody")],
]
story.append(Table(state_data, colWidths=[34*mm,64*mm,76*mm], repeatRows=1, style=[("BACKGROUND",(0,0),(-1,0),MINT),("GRID",(0,0),(-1,-1),.5,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE,PALE]),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)]))
story.append(Spacer(1, 7*mm))
story += section_title(8, "Cơ chế đồng bộ đa nền tảng")
sync_cards = Table([[card("SAU KHI SALE CHỐT", "Order trung tâm cập nhật hạng khách, danh sách dòng hàng cuối, số lượng, giá, quy cách, tổng tiền, revision và trạng thái."), card("TRÊN WEBSITE", "Khách xem đúng tổng cuối, chi tiết từng dòng, quy cách và tải PDF xác nhận từ Cổng Đối Tác VIP.")],
                    [card("TRÊN ZALO MINI APP", "Khách tải lại danh sách đơn để thấy cùng trạng thái, sản phẩm, giá và quy cách như Website."), card("TRÊN ADMIN & PDF", "Admin giữ lịch sử xử lý; PDF là snapshot bất biến của từng revision để làm chứng từ trao đổi.", ORANGE)]], colWidths=[86*mm,86*mm], style=[("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),2),("RIGHTPADDING",(0,0),(-1,-1),2),("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3)])
story.append(sync_cards)
story.append(Spacer(1, 7*mm))
story.append(P("Nguyên tắc: <b>orders + order_items trong Supabase là nguồn sự thật duy nhất</b>. Google Sheet chỉ phục vụ luồng leads/báo giá, không phải nơi điều hành đơn hàng đã đặt.", "Quote"))
story.append(PageBreak())

# Operations and governance
story += section_title(9, "Phân công trách nhiệm vận hành")
roles = [
    [P("Vai trò", "TableHead"), P("Trách nhiệm", "TableHead"), P("Điểm kiểm soát", "TableHead")],
    [P("Khách hàng", "TableBody"), P("Cung cấp tài khoản, địa chỉ, danh sách hàng, số lượng và ghi chú nhu cầu.", "TableBody"), P("Xác nhận lại nội dung khi nhận PDF từ sale.", "TableBody")],
    [P("Nhân viên sale", "TableBody"), P("Liên hệ khách, phân loại hạng, hoàn thiện sản phẩm/quy cách, chốt giá và phát hành PDF.", "TableBody"), P("Không chuyển xử lý hoặc ghi nhận thanh toán khi giá chưa finalized.", "TableBody")],
    [P("Bộ phận vận hành", "TableBody"), P("Chuẩn bị hàng, giao nhận và cập nhật tiến độ đơn.", "TableBody"), P("Thực hiện theo revision PDF mới nhất.", "TableBody")],
    [P("Kế toán/Công nợ", "TableBody"), P("Theo dõi điều khoản thanh toán, công nợ và đối soát.", "TableBody"), P("COD trong Mini App không phải bằng chứng đã thanh toán.", "TableBody")],
    [P("Quản lý", "TableBody"), P("Giám sát đơn chờ, doanh số, thời gian xử lý và lịch sử thay đổi.", "TableBody"), P("Kiểm tra các đơn chốt lại nhiều revision hoặc điều chỉnh giá lớn.", "TableBody")],
]
story.append(Table(roles, colWidths=[36*mm,78*mm,60*mm], repeatRows=1, style=[("BACKGROUND",(0,0),(-1,0),MINT),("GRID",(0,0),(-1,-1),.5,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE,PALE]),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)]))
story.append(Spacer(1, 7*mm))

story += section_title(10, "Checklist xử lý một đơn hàng")
checks = [
    "Đã kiểm tra tên khách, công ty, số điện thoại và địa chỉ giao hàng.",
    "Đã xác nhận khách thuộc VIP0/VIP1/VIP2/VIP3 và lý do phân loại.",
    "Đã liên hệ khách để xác nhận tất cả sản phẩm và số lượng cuối.",
    "Đã ghi quy cách riêng cho các mặt hàng cần sơ chế, kích cỡ hoặc đóng gói.",
    "Đã chọn đúng cơ chế giá và kiểm tra tổng điều chỉnh/phí giao hàng.",
    "Đã bấm xác nhận đơn cuối cùng và kiểm tra revision mới.",
    "Đã tải/mở PDF, kiểm tra logo, mã đơn, sản phẩm, quy cách và tổng tiền.",
    "Đã gửi PDF cho khách và chỉ sau đó mới chuyển đơn sang chuẩn bị/giao hàng.",
]
check_rows = []
for i, text in enumerate(checks, 1):
    check_rows.append([P("☐", "CardTitle"), P(str(i), "TableBodyCenter"), P(text, "TableBody")])
story.append(Table(check_rows, colWidths=[9*mm,10*mm,155*mm], style=[("GRID",(0,0),(-1,-1),.45,LINE),("ROWBACKGROUNDS",(0,0),(-1,-1),[WHITE,PALE]),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)]))
story.append(Spacer(1, 8*mm))
story.append(Table([[P("KẾT LUẬN", "CardTitle"), P("Quy trình mới bảo đảm TPS1 tiếp nhận đơn thuận tiện trên cả Website và Zalo, nhưng vẫn duy trì quyền kiểm soát giá và quy cách tại bộ phận sale. Mọi nền tảng cùng nhìn vào một đơn hàng trung tâm, giảm sai lệch thông tin, tránh chốt nhầm giá và tạo được chứng từ thống nhất để giao tiếp với khách hàng.", "CardBody")]], colWidths=[35*mm,139*mm], style=[("BACKGROUND",(0,0),(-1,-1),GREEN_LIGHT),("BOX",(0,0),(-1,-1),.8,GREEN),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("LEFTPADDING",(0,0),(-1,-1),9),("RIGHTPADDING",(0,0),(-1,-1),9),("TOPPADDING",(0,0),(-1,-1),9),("BOTTOMPADDING",(0,0),(-1,-1),9)]))

doc.build(story)
print(OUT)
