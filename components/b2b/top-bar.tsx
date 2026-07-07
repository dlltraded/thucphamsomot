import { ShieldCheck, Award, Phone } from "lucide-react";
import { siteConfig } from "@/lib/site";

const items = [
  { icon: ShieldCheck, text: "Đạt chuẩn ISO 22000 & HACCP" },
  { icon: Award, text: "Bảo hiểm trách nhiệm sản phẩm 5.000.000.000 VNĐ" },
  { icon: Phone, text: `Hotline B2B: ${siteConfig.phone}` },
  { icon: ShieldCheck, text: "Giao hàng đúng hẹn 100%" },
  { icon: Award, text: "109+ khách hàng doanh nghiệp tin dùng" },
];

export function TopBar() {
  // Duplicate items for seamless loop
  const allItems = [...items, ...items];

  return (
    <div className="b2b-topbar" role="banner" aria-label="Thông tin chứng chỉ và liên hệ">
      <div className="b2b-topbar__track" aria-hidden="true">
        {allItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <span key={i} className="b2b-topbar__item">
              <Icon size={13} />
              {item.text}
              {i < allItems.length - 1 && <span className="b2b-topbar__dot" />}
            </span>
          );
        })}
      </div>
      {/* Screen reader accessible version */}
      <p className="sr-only">
        {items.map((i) => i.text).join(" · ")}
      </p>
    </div>
  );
}
