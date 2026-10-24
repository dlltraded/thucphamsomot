import { ShieldCheck, Truck, ClipboardList, Building2, Award, Zap } from "lucide-react";

const texts = {
  vi: {
    label: "Cam kết dịch vụ",
    title: "Vì sao nhiều gian bếp chọn TPS1?",
    desc: "Mỗi cam kết dưới đây được giữ bằng việc làm mỗi ngày, từ chuyến hàng sáng sớm đến tờ hóa đơn cuối tháng.",
    pillars: [
      {
        icon: ShieldCheck,
        color: "#0f6f4b",
        bg: "rgba(15,111,75,0.10)",
        title: "Rõ nguồn gốc, đủ hồ sơ",
        desc: "Hàng có nguồn gốc rõ ràng, kèm hồ sơ an toàn thực phẩm và chứng từ pháp lý khi quý khách cần đối chiếu.",
      },
      {
        icon: Truck,
        color: "#1d4ed8",
        bg: "rgba(29,78,216,0.10)",
        title: "Đúng giờ, đúng nhịp bếp",
        desc: "Giao theo ca, theo ngày hoặc theo tuần bằng xe lạnh chuyên dụng, để hàng về bếp vẫn giữ trọn độ tươi.",
      },
      {
        icon: ClipboardList,
        color: "#c7372f",
        bg: "rgba(199,55,47,0.10)",
        title: "Báo giá trong 24 giờ",
        desc: "Mỗi gian bếp nhận một phương án giá riêng, tính theo sản lượng và nhịp đặt hàng thực tế.",
      },
      {
        icon: Building2,
        color: "#7c3aed",
        bg: "rgba(124,58,237,0.10)",
        title: "Phục vụ từ năm 2017",
        desc: "Hơn 109 doanh nghiệp và bếp ăn, từ nhà hàng, bếp công ty đến trường học, đang tin chọn TPS1.",
      },
      {
        icon: Award,
        color: "#b45309",
        bg: "rgba(180,83,9,0.10)",
        title: "Hóa đơn VAT đầy đủ",
        desc: "Xuất hóa đơn điện tử hợp lệ, hỗ trợ chuyển khoản và công nợ theo thỏa thuận.",
      },
      {
        icon: Zap,
        color: "#0891b2",
        bg: "rgba(8,145,178,0.10)",
        title: "Danh mục 5.000+ sản phẩm",
        desc: "Rau củ, thịt cá, hàng đông lạnh, gia vị, đồ khô và thực phẩm chay, gói gọn trong một đầu mối cho cả gian bếp.",
      },
    ]
  },
  en: {
    label: "Service Commitment",
    title: "Why do businesses choose TPS1?",
    desc: "More than just a supplier — TPS1 is a long-term, reliable catering partner.",
    pillars: [
      {
        icon: ShieldCheck,
        color: "#0f6f4b",
        bg: "rgba(15,111,75,0.10)",
        title: "Verified Source",
        desc: "Food-safety and legal documents are available for B2B review on request.",
      },
      {
        icon: Truck,
        color: "#1d4ed8",
        bg: "rgba(29,78,216,0.10)",
        title: "Scheduled Delivery",
        desc: "Flexible scheduling by shift, day, or week. Specialized fleet ensuring cold chain temperature.",
      },
      {
        icon: ClipboardList,
        color: "#c7372f",
        bg: "rgba(199,55,47,0.10)",
        title: "Quote within 24h",
        desc: "Each customer gets a custom pricing plan tailored to volume and actual order cycles.",
      },
      {
        icon: Building2,
        color: "#7c3aed",
        bg: "rgba(124,58,237,0.10)",
        title: "B2B Experience",
        desc: "Serving factories, schools, hospitals, and industrial catering operators in Dong Nai.",
      },
      {
        icon: Award,
        color: "#b45309",
        bg: "rgba(180,83,9,0.10)",
        title: "Full VAT Invoices",
        desc: "Valid e-invoices. Supporting bank transfers and debt clearing based on agreements.",
      },
      {
        icon: Zap,
        color: "#0891b2",
        bg: "rgba(8,145,178,0.10)",
        title: "5,000+ Product Catalog",
        desc: "Vegetables, meat, frozen foods, spices, vegetarian foods — all from a single supplier.",
      },
    ]
  }
};

export function TrustPillars({ locale = "vi" }: { locale?: "vi" | "en" }) {
  const t = texts[locale];

  return (
    <section className="b2b-pillars" aria-labelledby="pillars-heading">
      <div className="container-shell">
        <div className="mb-12">
          <div className="section-label">{t.label}</div>
          <h2 id="pillars-heading" className="section-title">
            {t.title}
          </h2>
          <p className="section-desc">
            {t.desc}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          {t.pillars.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="b2b-pillar-card">
                <div
                  className="b2b-pillar-icon"
                  style={{ background: p.bg, color: p.color }}
                >
                  <Icon size={26} />
                </div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "8px", color: "#133127" }}>
                  {p.title}
                </h3>
                <p style={{ fontSize: "0.9rem", color: "#59665f", lineHeight: 1.7, margin: 0 }}>
                  {p.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
