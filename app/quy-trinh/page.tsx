import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Clock, FileText, Truck, Box, Users, AlertTriangle } from "lucide-react";
import { makeMetadata } from "@/lib/seo";

export const metadata = makeMetadata({
  title: "Quy Trình Giao Nhận - Thực Phẩm Số 1",
  description: "Quy trình vận hành khép kín 6 bước chuẩn ISO 22000 và HACCP của TPS1, đảm bảo chất lượng từ nông trại đến bếp ăn.",
  path: "/quy-trinh",
});

const PROCESS_STEPS = [
  {
    title: "Tiếp Nhận & Lên Kế Hoạch",
    desc: "Nhận PO (đơn đặt hàng) từ đối tác qua hệ thống Cổng Đối Tác VIP. Bộ phận điều phối lên kế hoạch thu mua và phân bổ nhân sự sản xuất, đảm bảo khớp với lịch giao nhận của từng nhà máy.",
    icon: FileText,
    image: "/images/process/step1.jpg",
  },
  {
    title: "Thu Mua & Kiểm Dịch Đầu Vào",
    desc: "Nguồn hàng từ các nông trại chuẩn VietGAP được vận chuyển về kho trong đêm. Đội ngũ QA/QC tiến hành kiểm tra giấy chứng nhận thú y, test nhanh dư lượng bảo vệ thực vật trước khi nhập kho.",
    icon: ShieldCheck,
    image: "/images/process/step%202.png",
  },
  {
    title: "Sơ Chế & Đóng Gói",
    desc: "Thực hiện sơ chế (làm sạch, cắt thái) theo yêu cầu định lượng riêng của từng bếp. Sản phẩm được hút chân không và dán tem nhãn truy xuất nguồn gốc rõ ràng trong phòng lạnh đạt chuẩn ISO 22000.",
    icon: CheckCircle2,
    image: "/images/process/step3.png",
  },
  {
    title: "Lưu Trữ Kho Lạnh",
    desc: "Hàng hoá thành phẩm được chuyển ngay vào kho mát / kho đông theo đúng dải nhiệt độ tiêu chuẩn để bảo toàn dinh dưỡng và độ tươi ngon. Phân loại theo mã lộ trình giao hàng.",
    icon: Box,
    image: "/images/process/step4.png",
  },
  {
    title: "Vận Chuyển Xe Lạnh",
    desc: "Xuất kho lên đội xe tải đông lạnh chuyên dụng. Hệ thống GPS và cảm biến nhiệt độ theo dõi liên tục suốt hành trình, đảm bảo nhiệt độ luôn ở mức tối ưu từ kho đến tận cửa bếp.",
    icon: Truck,
    image: "/images/process/step5.png",
  },
  {
    title: "Bàn Giao & Kiểm Tra",
    desc: "Nhân viên TPS1 giao hàng tận nơi. Quản lý bếp tiến hành cân đối soát, kiểm tra độ tươi và nhiệt độ lõi sản phẩm. Ký nhận hoàn tất quy trình qua ứng dụng di động.",
    icon: Users,
    image: "/images/process/step6.png",
  },
];

export default function ProcessPage() {
  return (
    <main className="b2b-process-page">
      {/* 1. HERO SECTION */}
      <section className="b2b-process-hero">
        <div className="container-shell position-relative z-10 text-center">
          <div className="section-label" style={{ color: "#4ade80", justifyContent: "center" }}>
            Vận Hành Khép Kín
          </div>
          <h1 className="b2b-process-hero__title">
            Quy trình giao nhận<br />
            <span style={{ color: "#4ade80" }}>chuẩn mực B2B</span>
          </h1>
          <p className="b2b-process-hero__desc">
            Từ khâu kiểm duyệt đầu vào đến khi giao hàng tận bếp, mọi bước đi đều được 
            kiểm soát nghiêm ngặt theo tiêu chuẩn ISO 22000 và HACCP.
          </p>
        </div>
      </section>

      {/* 2. TIMELINE SECTION */}
      <section className="b2b-process-timeline-section">
        <div className="container-shell">
          <div className="b2b-timeline">
            {PROCESS_STEPS.map((step, index) => {
              const isEven = index % 2 === 0;
              return (
                <div key={index} className={`b2b-timeline__item ${isEven ? 'is-left' : 'is-right'}`}>
                  {/* Cột Nội Dung */}
                  <div className="b2b-timeline__content-col">
                    <div className="b2b-timeline__step-num">Bước 0{index + 1}</div>
                    <h3 className="b2b-timeline__title">{step.title}</h3>
                    <p className="b2b-timeline__desc">{step.desc}</p>
                    <div className="b2b-timeline__icon-wrap">
                      <step.icon size={24} className="b2b-timeline__icon" />
                    </div>
                  </div>

                  {/* Trục Giữa */}
                  <div className="b2b-timeline__center">
                    <div className="b2b-timeline__dot"></div>
                    {index !== PROCESS_STEPS.length - 1 && <div className="b2b-timeline__line"></div>}
                  </div>

                  {/* Cột Hình Ảnh */}
                  <div className="b2b-timeline__image-col">
                    <div className="b2b-timeline__image-wrap">
                      <Image
                        src={step.image}
                        alt={step.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. CHÍNH SÁCH ĐỔI TRẢ & BỒI THƯỜNG */}
      <section className="b2b-policy-section">
        <div className="container-shell">
          <div className="b2b-policy-box">
            <div className="b2b-policy-header">
              <AlertTriangle size={32} className="b2b-policy-icon" />
              <div>
                <h2 className="b2b-policy-title">Chính sách xử lý sự cố & Đổi trả</h2>
                <p className="b2b-policy-subtitle">
                  Tại TPS1, chúng tôi hiểu rằng &quot;Trong bếp ăn công nghiệp, trễ 1 phút là đói 1.000 người&quot;. 
                  Do đó, chính sách xử lý sự cố của chúng tôi được thiết kế để bảo vệ tuyệt đối kế hoạch sản xuất của bạn.
                </p>
              </div>
            </div>
            
            <div className="b2b-policy-grid">
              <div className="b2b-policy-card">
                <h4 className="b2b-policy-card__title">Phát hiện ngay lúc giao (Tại cửa bếp)</h4>
                <p className="b2b-policy-card__desc">
                  Nếu hàng hóa sai quy cách, không đạt độ tươi hoặc thiếu hụt định lượng khi bếp trưởng kiểm tra: 
                  <strong> TPS1 đổi trả 1-1 và lập tức điều động xe tải nhỏ (van lạnh) giao bổ sung trong vòng 1-2 tiếng</strong> để không ảnh hưởng ca nấu.
                </p>
              </div>
              <div className="b2b-policy-card">
                <h4 className="b2b-policy-card__title">Phát hiện khi đang sơ chế</h4>
                <p className="b2b-policy-card__desc">
                  Trong trường hợp lỗi ngầm (hỏng bên trong củ quả, thịt) chỉ phát hiện khi thái cắt:
                  <strong> Bếp chỉ cần chụp ảnh lại. Chúng tôi sẽ tự động cấn trừ 100% giá trị hàng hỏng vào công nợ</strong> hoặc giao bù ngay vào sáng hôm sau.
                </p>
              </div>
              <div className="b2b-policy-card">
                <h4 className="b2b-policy-card__title">Rủi ro an toàn thực phẩm</h4>
                <p className="b2b-policy-card__desc">
                  Trong trường hợp hi hữu xảy ra sự cố ngộ độc do nguồn hàng đã được kết luận từ cơ quan chức năng:
                  <strong> TPS1 chịu trách nhiệm pháp lý và bồi thường thông qua Quỹ bảo hiểm VietinBank hạn mức 5 Tỷ VNĐ</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CTA */}
      <section className="b2b-cta-band">
        <div className="container-shell position-relative z-10" style={{ textAlign: "center" }}>
          <h2 className="section-title-light">Kết nối với hệ thống vận hành của TPS1</h2>
          <p className="section-desc" style={{ color: "rgba(255,255,255,0.7)", margin: "0 auto 32px" }}>
            Trải nghiệm chuỗi cung ứng thực phẩm chuẩn xác, minh bạch và an tâm tuyệt đối.
          </p>
          <Link href="/bao-gia" className="btn-hero-primary" style={{ display: "inline-flex" }}>
            Yêu cầu báo giá <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}


