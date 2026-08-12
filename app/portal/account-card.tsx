"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CustomerSession } from "@/lib/customer-session";

const TIER_LABEL: Record<string, string> = {
  VIP1: "VIP1 — Khách thân thiết",
  VIP2: "VIP2 — Khách lớn",
  VIP3: "VIP3 — Đối tác chiến lược",
};

export function AccountCard({ session }: { session: CustomerSession }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await fetch("/api/customer/logout", { method: "POST" });
    router.push("/portal/dang-nhap");
    router.refresh();
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          border: "1px solid #eee",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>Tài khoản khách hàng</h2>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              background: "rgba(27,122,61,0.1)",
              color: "#1B7A3D",
              borderRadius: 999,
              padding: "4px 10px",
            }}
          >
            {TIER_LABEL[session.tier] || session.tier}
          </span>
        </div>

        <dl style={{ display: "grid", gap: 10, margin: 0, fontSize: 14 }}>
          <Row label="Mã khách hàng" value={session.code} />
          <Row label="Tên" value={session.name} />
          {session.company && <Row label="Công ty" value={session.company} />}
          <Row label="Số điện thoại" value={session.phone} />
          {session.email && <Row label="Email" value={session.email} />}
          {session.taxCode && <Row label="Mã số thuế" value={session.taxCode} />}
          {session.address && <Row label="Địa chỉ đơn vị" value={session.address} />}
          {session.defaultShippingAddress?.address && (
            <Row
              label="Địa chỉ giao mặc định"
              value={`${session.defaultShippingAddress.alias ? `${session.defaultShippingAddress.alias}: ` : ""}${session.defaultShippingAddress.address}`}
            />
          )}
          <Row
            label="Chiết khấu"
            value={`${session.discountPercent}% trên mọi đơn hàng`}
            highlight
          />
        </dl>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 24,
          }}
        >
          <Link href="/portal/gio-hang" className="btn-primary">
            Giỏ hàng của tôi
          </Link>
          <Link href="/portal/don-hang" className="btn-secondary">
            Đơn hàng đã đặt
          </Link>
          <Link href="/portal/doi-mat-khau" className="btn-secondary">
            Đổi mật khẩu
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="btn-secondary"
            style={{ cursor: "pointer" }}
          >
            {loading ? "Đang đăng xuất..." : "Đăng xuất"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <dt style={{ color: "#666" }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 600, color: highlight ? "#1B7A3D" : "#111" }}>{value}</dd>
    </div>
  );
}
