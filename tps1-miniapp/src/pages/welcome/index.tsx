import { useNavigate } from "react-router-dom";
import { Page } from "zmp-ui";
import CONFIG from "@/config";
import logoUrl from "@/static/logo.png";
import heroBg from "@/static/cat_vegetables.png";

const TRUST_BADGES = [
  "✅ ISO 22000 & HACCP",
  "🛡️ Bảo hiểm SP 5 tỷ",
  "🚚 Giao đúng hẹn 100%",
  "🤝 100+ khách hàng B2B",
];

const VALUE_POINTS = [
  {
    emoji: "🏷️",
    title: "Giá sỉ theo nhóm khách hàng",
    desc: "Đăng nhập tài khoản để nhận chiết khấu riêng theo nhóm VIP1/VIP2/VIP3",
  },
  {
    emoji: "🚚",
    title: "Giao hàng định kỳ đúng hẹn",
    desc: "Chủ động lịch giao cho bếp ăn, nhà máy, trường học tại Đồng Nai và lân cận",
  },
  {
    emoji: "📦",
    title: "5000+ mặt hàng đầy đủ ngành hàng",
    desc: "Rau củ quả, hải sản, thịt & đông lạnh, gia vị, đồ khô... một nguồn cung duy nhất",
  },
];

export default function WelcomePage() {
  const navigate = useNavigate();

  const markSeen = () => {
    localStorage.setItem(CONFIG.STORAGE_KEYS.WELCOME_SEEN, "1");
  };

  const handleBrowse = () => {
    markSeen();
    navigate("/", { replace: true });
  };

  const handleLogin = () => {
    markSeen();
    navigate("/login", { replace: true });
  };

  return (
    <Page className="flex flex-col h-screen bg-white">
      <div className="flex-1 overflow-y-auto">
        {/* Hero với ảnh nền thực phẩm */}
        <div
          className="relative overflow-hidden px-6 pb-6"
          style={{
            backgroundImage: `linear-gradient(175deg, rgba(15,60,32,0.88) 0%, rgba(27,122,61,0.82) 55%, rgba(61,190,119,0.75) 100%), url(${heroBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            paddingTop: "calc(var(--safe-top, 30px) + 20px)",
          }}
        >
          <div className="relative flex flex-col items-center text-center">
            <img
              src={logoUrl}
              alt="Thực Phẩm Số Một"
              className="welcome-scale-in w-14 h-14 rounded-full bg-white object-contain p-1.5 shadow-lg"
            />
            <h1
              className="welcome-fade-up text-lg font-bold text-white mt-2 leading-snug"
              style={{ animationDelay: "0.08s" }}
            >
              Chào mừng đến với Thực Phẩm Số Một 👋
            </h1>
            <p
              className="welcome-fade-up text-xs text-white/90 mt-1 leading-relaxed max-w-[300px]"
              style={{ animationDelay: "0.14s" }}
            >
              Cảm ơn quý khách đã quan tâm đến TPS1 — rất vui được đồng hành
              cùng bếp ăn, nhà máy, trường học của quý khách.
            </p>

            <div
              className="welcome-fade-up flex flex-wrap justify-center gap-1.5 mt-3"
              style={{ animationDelay: "0.2s" }}
            >
              {TRUST_BADGES.map((badge) => (
                <span
                  key={badge}
                  className="text-2xs font-medium bg-white/15 text-white rounded-full px-2 py-1"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Value points */}
        <div className="px-4 pt-4 pb-6 space-y-2.5">
          {VALUE_POINTS.map((point, idx) => (
            <div
              key={point.title}
              className="welcome-fade-up flex items-start space-x-3 bg-section rounded-xl p-3 border-[0.5px] border-black/10"
              style={{ animationDelay: `${0.28 + idx * 0.08}s` }}
            >
              <span className="text-2xl leading-none flex-none">{point.emoji}</span>
              <div>
                <div className="font-semibold text-sm text-foreground">{point.title}</div>
                <div className="text-xs text-subtitle mt-0.5">{point.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-none p-4 pb-5 space-y-2 bg-white border-t border-black/5">
        <button
          type="button"
          onClick={handleBrowse}
          className="welcome-cta-primary w-full py-3.5 rounded-lg bg-primary text-white font-semibold text-sm"
        >
          Xem sản phẩm ngay →
        </button>
        <button
          type="button"
          onClick={handleLogin}
          className="w-full py-3 rounded-lg border-[1.5px] border-primary text-primary font-medium text-sm"
        >
          Đăng nhập tài khoản khách hàng
        </button>
      </div>
    </Page>
  );
}
