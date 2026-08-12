"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { CustomerSession } from "@/lib/customer-session";

const TIER_LABEL: Record<string, string> = {
  VIP1: "Khách thân thiết",
  VIP2: "Khách hàng lớn",
  VIP3: "Đối tác chiến lược",
};

export function AccountCard({ session }: { session: CustomerSession }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const initials = session.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const shipping = session.defaultShippingAddress;

  const handleLogout = async () => {
    setLoading(true);
    await fetch("/api/customer/logout", { method: "POST" });
    router.push("/portal/dang-nhap");
    router.refresh();
  };

  return (
    <div className="customer-portal">
      <section className="customer-hero">
        <div className="customer-hero__identity">
          <div className="customer-avatar" aria-hidden="true">{initials || "VIP"}</div>
          <div>
            <div className="customer-hero__badges">
              <span className="customer-pill customer-pill--vip"><Sparkles size={14} />{session.tier}</span>
              <span className="customer-pill"><ShieldCheck size={14} /> Tài khoản đã xác thực</span>
            </div>
            <p className="customer-hero__welcome">Xin chào đối tác,</p>
            <h2>{session.name}</h2>
            <p>{session.company || "Khách hàng Thực Phẩm Số Một"}</p>
          </div>
        </div>
        <div className="customer-discount">
          <span>Ưu đãi hiện tại</span>
          <strong>{session.discountPercent}%</strong>
          <small>áp dụng trên mỗi đơn hàng</small>
        </div>
      </section>

      <div className="customer-layout">
        <div className="customer-main-column">
          <section className="customer-panel">
            <div className="customer-panel__heading">
              <div><span className="customer-section-kicker">Hồ sơ đối tác</span><h3>Thông tin khách hàng</h3></div>
              <span className="customer-code">Mã KH: {session.code}</span>
            </div>
            <div className="customer-info-grid">
              <Info icon={<UserRound />} label="Người liên hệ" value={session.name} />
              <Info icon={<Phone />} label="Số điện thoại" value={session.phone} />
              <Info icon={<Building2 />} label="Công ty / đơn vị" value={session.company || "Chưa cập nhật"} />
              <Info icon={<Mail />} label="Email" value={session.email || "Chưa cập nhật"} />
              {session.taxCode && <Info icon={<ReceiptText />} label="Mã số thuế" value={session.taxCode} />}
              {session.address && <Info icon={<MapPin />} label="Địa chỉ đơn vị" value={session.address} wide />}
            </div>
          </section>

          <section className="customer-panel customer-shipping-panel">
            <div className="customer-panel__heading">
              <div><span className="customer-section-kicker">Giao nhận</span><h3>Địa chỉ giao hàng mặc định</h3></div>
              <span className="customer-default-tag">Mặc định</span>
            </div>
            {shipping?.address ? (
              <div className="customer-address-card">
                <div className="customer-address-card__icon"><MapPin /></div>
                <div>
                  <strong>{shipping.alias || "Địa chỉ giao hàng"}</strong>
                  <p>{shipping.address}</p>
                  <span>{shipping.name || session.name} · {shipping.phone || session.phone}</span>
                </div>
              </div>
            ) : (
              <div className="customer-empty-inline"><MapPin /><span>Chưa có địa chỉ mặc định. Anh/chị vẫn có thể thêm địa chỉ mới khi đặt hàng.</span></div>
            )}
          </section>
        </div>

        <aside className="customer-side-column">
          <section className="customer-panel customer-actions-panel">
            <span className="customer-section-kicker">Thao tác nhanh</span>
            <h3>Quản lý mua hàng</h3>
            <Link href="/portal/gio-hang" className="customer-action customer-action--primary">
              <span className="customer-action__icon"><ShoppingCart /></span>
              <span><strong>Giỏ hàng của tôi</strong><small>Kiểm tra sản phẩm và đặt hàng</small></span>
              <ArrowRight />
            </Link>
            <Link href="/portal/don-hang" className="customer-action">
              <span className="customer-action__icon"><PackageCheck /></span>
              <span><strong>Đơn hàng đã đặt</strong><small>Theo dõi trạng thái giao hàng</small></span>
              <ArrowRight />
            </Link>
            <Link href="/portal/doi-mat-khau" className="customer-action">
              <span className="customer-action__icon"><KeyRound /></span>
              <span><strong>Đổi mật khẩu</strong><small>Bảo vệ tài khoản của anh/chị</small></span>
              <ArrowRight />
            </Link>
            <button type="button" onClick={handleLogout} disabled={loading} className="customer-logout">
              <LogOut size={17} /> {loading ? "Đang đăng xuất..." : "Đăng xuất tài khoản"}
            </button>
          </section>
          <div className="customer-support-note">
            <Phone size={18} />
            <div><span>Cần hỗ trợ đơn hàng?</span><a href="tel:0898902222">089.890.2222</a></div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Info({ icon, label, value, wide }: { icon: React.ReactNode; label: string; value: string; wide?: boolean }) {
  return (
    <div className={`customer-info${wide ? " customer-info--wide" : ""}`}>
      <span className="customer-info__icon">{icon}</span>
      <div><span>{label}</span><strong>{value}</strong></div>
    </div>
  );
}
