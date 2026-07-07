import { ShieldCheck, Truck, ClipboardList, Building2, Award, Zap } from "lucide-react";

const texts = {
  vi: {
    label: "Cam kết dịch vụ",
    title: "Tại sao doanh nghiệp chọn TPS1?",
    desc: "Không chỉ là nhà cung cấp — TPS1 là đối tác vận hành bếp ăn lâu dài, đáng tin cậy.",
    pillars: [
      {
        icon: ShieldCheck,
        color: "#0f6f4b",
        bg: "rgba(15,111,75,0.10)",
        title: "Nguồn hàng kiểm định",
        desc: "Đạt chuẩn ISO 22000 & HACCP. Bảo hiểm trách nhiệm sản phẩm 5 tỷ VNĐ. Đầy đủ hồ sơ pháp lý.",
      },
      {
        icon: Truck,
        color: "#1d4ed8",
        bg: "rgba(29,78,216,0.10)",
        title: "Giao hàng định kỳ",
        desc: "Lịch giao linh hoạt theo ca, ngày hoặc tuần. Đội xe chuyên dụng, đảm bảo nhiệt độ chuỗi lạnh.",
      },
      {
        icon: ClipboardList,
        color: "#c7372f",
        bg: "rgba(199,55,47,0.10)",
        title: "Báo giá trong 24h",
        desc: "Mỗi khách hàng nhận phương án giá riêng, phù hợp sản lượng và chu kỳ đặt hàng thực tế.",
      },
      {
        icon: Building2,
        color: "#7c3aed",
        bg: "rgba(124,58,237,0.10)",
        title: "Kinh nghiệm B2B",
        desc: "Phục vụ nhà máy, trường học, bệnh viện và suất ăn công nghiệp tại Đồng Nai 10+ năm.",
      },
      {
        icon: Award,
        color: "#b45309",
        bg: "rgba(180,83,9,0.10)",
        title: "Hóa đơn VAT đầy đủ",
        desc: "Xuất hóa đơn điện tử hợp lệ. Hỗ trợ thanh toán chuyển khoản, công nợ theo thỏa thuận.",
      },
      {
        icon: Zap,
        color: "#0891b2",
        bg: "rgba(8,145,178,0.10)",
        title: "Danh mục 2.000+ SKU",
        desc: "Rau củ, thịt cá, đông lạnh, gia vị, thực phẩm chay — tất cả từ một nhà cung cấp duy nhất.",
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
        desc: "ISO 22000 & HACCP standards. 5B VND product liability insurance. Full legal documentation.",
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
        desc: "Serving factories, schools, hospitals, and industrial catering in Dong Nai for 10+ years.",
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
        title: "2,000+ SKU Catalog",
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
