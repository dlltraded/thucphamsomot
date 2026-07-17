import { makeMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import Link from "next/link";
import { ShieldCheck, Phone, Mail, ArrowRight } from "lucide-react";

export const metadata = makeMetadata({
  title: "Chính sách bảo mật | Thực Phẩm Số Một – Bảo vệ thông tin khách hàng",
  description:
    "Chính sách bảo mật thông tin của Công ty TNHH Thực Phẩm Số Một: mục đích thu thập, phạm vi sử dụng, cam kết không chia sẻ cho bên thứ ba.",
  path: "/chinh-sach-bao-mat",
});

const sections = [
  {
    num: "01",
    title: "Mục đích và phạm vi thu thập thông tin",
    body: (
      <>
        <p>
          Công ty TNHH Thực Phẩm Số Một (TPS1) thu thập thông tin của đối tác và khách hàng qua form
          liên hệ, yêu cầu báo giá, hợp đồng và quá trình giao nhận trực tiếp. Các thông tin có thể
          được thu thập bao gồm: họ tên, số điện thoại, email, tên doanh nghiệp và địa chỉ giao hàng.
        </p>
        <p style={{ marginTop: "12px" }}>Mục đích thu thập:</p>
        <ul style={{ paddingLeft: "20px", marginTop: "10px", display: "grid", gap: "8px" }}>
          <li>Hỗ trợ tư vấn, lập báo giá và cung cấp thông tin sản phẩm, dịch vụ.</li>
          <li>Xử lý đơn đặt hàng, lên kế hoạch giao nhận và quản lý logistics.</li>
          <li>Giải quyết các vấn đề, khiếu nại phát sinh trong quá trình hợp tác.</li>
          <li>Cải thiện chất lượng phục vụ và tùy chỉnh ưu đãi phù hợp từng đối tác.</li>
        </ul>
      </>
    ),
  },
  {
    num: "02",
    title: "Phạm vi sử dụng thông tin",
    body: (
      <p>
        Thực Phẩm Số Một cam kết chỉ sử dụng thông tin khách hàng trong nội bộ công ty để thực hiện
        các mục đích nêu trên. Chúng tôi <strong>tuyệt đối không bán, chia sẻ hay trao đổi</strong> thông
        tin cá nhân của khách hàng cho bất kỳ bên thứ ba nào, trừ trường hợp có yêu cầu từ cơ quan
        pháp luật có thẩm quyền theo quy định của Nhà nước.
      </p>
    ),
  },
  {
    num: "03",
    title: "Thời gian lưu trữ thông tin",
    body: (
      <>
        <p>Thông tin của khách hàng/đối tác được lưu trữ an toàn cho đến khi:</p>
        <ul style={{ paddingLeft: "20px", marginTop: "10px", display: "grid", gap: "8px" }}>
          <li>Khách hàng có yêu cầu hủy bỏ hoặc chỉnh sửa thông tin bằng văn bản.</li>
          <li>Công ty ngừng hoạt động kinh doanh (dữ liệu sẽ được tiêu hủy an toàn).</li>
        </ul>
        <p style={{ marginTop: "12px" }}>
          Trong mọi trường hợp khác, thông tin được bảo mật trên hệ thống quản trị khách hàng nội bộ.
        </p>
      </>
    ),
  },
  {
    num: "04",
    title: "Những người/tổ chức có thể tiếp cận thông tin",
    body: (
      <>
        <p>Các cá nhân hoặc bộ phận có quyền tiếp cận dữ liệu khách hàng:</p>
        <ul style={{ paddingLeft: "20px", marginTop: "10px", display: "grid", gap: "8px" }}>
          <li>Ban Giám Đốc và nhân viên phòng Kinh doanh, Kế toán, Chăm sóc khách hàng, Giao nhận trực tiếp xử lý đơn.</li>
          <li>Đối tác vận chuyển – chỉ được cung cấp thông tin giao nhận cơ bản để thực hiện nghiệp vụ.</li>
          <li>Cơ quan Nhà nước có thẩm quyền khi có yêu cầu hợp pháp.</li>
        </ul>
      </>
    ),
  },
  {
    num: "05",
    title: "Cam kết bảo mật",
    body: (
      <p>
        Bảo vệ dữ liệu khách hàng là ưu tiên hàng đầu của TPS1. Chúng tôi áp dụng các tiêu chuẩn
        quản lý an toàn thông tin nghiêm ngặt để ngăn hành vi truy cập trái phép, sửa đổi, tiết lộ
        hay phá hủy dữ liệu. Trong trường hợp xảy ra sự cố, chúng tôi sẽ thông báo kịp thời đến
        khách hàng và cơ quan chức năng theo quy định hiện hành.
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="page-shell">
      {/* ── HERO BANNER ─────────────────────────────── */}
      <section style={{ background: "linear-gradient(135deg, #0a1a10 0%, #123127 100%)", padding: "56px 0 48px" }}>
        <div className="container-shell">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <div className="eyebrow" style={{ background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.2)", color: "#fff" }}>
              Chính sách
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
            <ShieldCheck size={40} color="#4ade80" />
            <h1 style={{ margin: 0, color: "#fff", fontSize: "clamp(34px, 5vw, 56px)", fontWeight: 900, lineHeight: 1.08 }}>
              Chính sách bảo mật
            </h1>
          </div>
          <p style={{ margin: "0 0 24px", color: "rgba(255,255,255,0.72)", fontSize: "1.05rem", lineHeight: 1.8, maxWidth: "62ch" }}>
            Cam kết bảo vệ thông tin cá nhân và dữ liệu của quý khách hàng &amp; đối tác trong suốt quá trình hợp tác với Thực Phẩm Số Một.
          </p>
          {/* Meta info */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
            {["Cập nhật: 2025", "Áp dụng cho tất cả kênh liên hệ", "Theo PDPA Việt Nam"].map((tag) => (
              <span key={tag} style={{
                padding: "6px 14px",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.78)",
                fontSize: "0.78rem",
                fontWeight: 700,
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ─────────────────────────────── */}
      <section className="container-shell section-pad">
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 320px)", gap: "32px", alignItems: "start" }}>

          {/* LEFT: Policy Sections */}
          <div style={{ display: "grid", gap: "20px" }}>
            {sections.map(({ num, title, body }) => (
              <div
                key={num}
                className="card"
                style={{ borderRadius: "24px", padding: "28px 32px" }}
              >
                <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  <div style={{
                    flexShrink: 0,
                    width: "44px",
                    height: "44px",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, #0f6f4b, #1a9662)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: "0.82rem",
                    fontWeight: 900,
                    letterSpacing: "0.04em",
                  }}>
                    {num}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ margin: "0 0 14px", color: "#123127", fontSize: "1.15rem", fontWeight: 900, lineHeight: 1.3 }}>
                      {title}
                    </h2>
                    <div style={{ color: "var(--muted-foreground)", lineHeight: 1.8, fontSize: "0.95rem" }}>
                      {body}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Section 6: Liên hệ giải đáp */}
            <div className="card" style={{ borderRadius: "24px", padding: "28px 32px" }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                <div style={{
                  flexShrink: 0,
                  width: "44px",
                  height: "44px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #0f6f4b, #1a9662)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "0.82rem",
                  fontWeight: 900,
                  letterSpacing: "0.04em",
                }}>
                  06
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ margin: "0 0 14px", color: "#123127", fontSize: "1.15rem", fontWeight: 900 }}>
                    Thông tin liên hệ giải đáp thắc mắc
                  </h2>
                  <p style={{ margin: "0 0 18px", color: "var(--muted-foreground)", lineHeight: 1.8 }}>
                    Mọi yêu cầu liên quan đến chính sách bảo mật, điều chỉnh hay xóa dữ liệu, vui lòng liên hệ trực tiếp với chúng tôi:
                  </p>
                  <div style={{ display: "grid", gap: "12px" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <Phone size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
                      <span style={{ color: "#123127", fontWeight: 700 }}>
                        Hotline: <a href={`tel:${siteConfig.phone.replace(/\s/g,"")}`} style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: "3px" }}>{siteConfig.phone}</a>
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <Mail size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
                      <span style={{ color: "#123127", fontWeight: 700 }}>
                        Email: <a href={`mailto:${siteConfig.email}`} style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: "3px" }}>{siteConfig.email}</a>
                      </span>
                    </div>
                    <div style={{ padding: "14px 16px", borderRadius: "12px", background: "rgba(15,111,75,0.06)", border: "1px solid rgba(15,111,75,0.12)", color: "#365044", fontSize: "0.9rem", lineHeight: 1.6 }}>
                      <strong style={{ display: "block", marginBottom: "4px", color: "#123127" }}>CÔNG TY TNHH THỰC PHẨM SỐ MỘT</strong>
                      {siteConfig.addressFull}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Sidebar */}
          <div style={{ display: "grid", gap: "16px", position: "sticky", top: "24px" }}>
            {/* Quick nav */}
            <div className="card" style={{ borderRadius: "20px", padding: "22px" }}>
              <div className="section-label" style={{ marginBottom: "14px" }}>Mục lục</div>
              <nav style={{ display: "grid", gap: "6px" }}>
                {sections.map(({ num, title }) => (
                  <div key={num} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "8px 10px", borderRadius: "10px", background: "rgba(15,111,75,0.04)" }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 900, color: "var(--accent)", minWidth: "20px", paddingTop: "2px" }}>{num}</span>
                    <span style={{ fontSize: "0.85rem", color: "#365044", lineHeight: 1.4, fontWeight: 600 }}>{title}</span>
                  </div>
                ))}
              </nav>
            </div>

            {/* Trust badge */}
            <div style={{ borderRadius: "20px", background: "linear-gradient(135deg, #0f6f4b, #123127)", padding: "24px", color: "#fff" }}>
              <ShieldCheck size={32} color="#4ade80" style={{ marginBottom: "12px" }} />
              <h3 style={{ margin: "0 0 10px", fontSize: "1.05rem", fontWeight: 900, lineHeight: 1.3 }}>
                Cam kết bảo mật tuyệt đối
              </h3>
              <p style={{ margin: "0 0 18px", color: "rgba(255,255,255,0.75)", fontSize: "0.87rem", lineHeight: 1.7 }}>
                Dữ liệu của quý khách không bao giờ được bán hoặc chia sẻ cho bên thứ ba.
              </p>
              <Link href="/lien-he" className="btn-primary" style={{ display: "inline-flex", gap: "8px", alignItems: "center", background: "#4ade80", color: "#0a1a10", fontSize: "0.87rem", fontWeight: 800, padding: "10px 16px", borderRadius: "10px", boxShadow: "none" }}>
                Liên hệ ngay <ArrowRight size={16} />
              </Link>
            </div>

            {/* Other policies */}
            <div className="card" style={{ borderRadius: "20px", padding: "22px" }}>
              <div className="section-label" style={{ marginBottom: "14px" }}>Chính sách khác</div>
              <div style={{ display: "grid", gap: "8px" }}>
                {[
                  { label: "Điều khoản sử dụng", href: "/chinh-sach/dieu-khoan-su-dung" },
                  { label: "Chính sách giao hàng", href: "/chinh-sach/chinh-sach-giao-hang" },
                  { label: "Chính sách đổi trả", href: "/chinh-sach/chinh-sach-doi-tra" },
                ].map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--border)", color: "#365044", fontSize: "0.87rem", fontWeight: 600, textDecoration: "none", transition: "background 0.15s ease" }}
                  >
                    {label}
                    <ArrowRight size={15} color="var(--accent)" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
