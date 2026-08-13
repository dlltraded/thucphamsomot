"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRef, useState } from "react";
import { CheckCircle2, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";

export function CartReview({
  discountPercent,
  tier,
  defaultShippingAddress,
}: {
  discountPercent: number;
  tier: string;
  defaultShippingAddress?: {
    alias: string;
    address: string;
    name: string;
    phone: string;
  };
}) {
  const { items, updateQty, removeItem, clear } = useCart();
  const router = useRouter();
  const [useDefaultAddress, setUseDefaultAddress] = useState(
    Boolean(defaultShippingAddress?.address)
  );
  const [deliveryAlias, setDeliveryAlias] = useState(defaultShippingAddress?.alias || "");
  const [deliveryAddress, setDeliveryAddress] = useState(defaultShippingAddress?.address || "");
  const [deliveryName, setDeliveryName] = useState(defaultShippingAddress?.name || "");
  const [deliveryPhone, setDeliveryPhone] = useState(defaultShippingAddress?.phone || "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successCode, setSuccessCode] = useState("");
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  const subtotal = items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);
  const discountedTotal = Math.round(subtotal * (1 - discountPercent / 100));

  const handleSubmit = async () => {
    setError("");
    if (items.length === 0) {
      setError("Giỏ hàng đang trống");
      return;
    }
    if (!deliveryAddress.trim()) {
      setError("Vui lòng nhập địa chỉ giao hàng");
      return;
    }
    if (!deliveryName.trim() || !deliveryPhone.trim()) {
      setError("Vui lòng nhập đầy đủ người nhận và số điện thoại nhận hàng");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/customer/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            slug: i.slug,
            title: i.title,
            quantity: i.quantity,
            price: i.price || 0,
          })),
          source: "website",
          idempotencyKey: idempotencyKey.current,
          deliveryAlias,
          deliveryAddress,
          deliveryName,
          deliveryPhone,
          note,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "Đặt hàng thất bại, vui lòng thử lại");
        return;
      }

      clear();
      setSuccessCode(data.orderCode);
    } catch {
      setError("Đặt hàng thất bại, vui lòng thử lại hoặc gọi hotline");
    } finally {
      setSubmitting(false);
    }
  };

  if (successCode) {
    return (
      <div style={{ maxWidth: 440, margin: "0 auto" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "32px 24px",
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(20,35,28,0.06)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(27,122,61,0.1)",
              color: "#1B7A3D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <CheckCircle2 size={28} />
          </div>
          <h2 style={{ color: "#1B7A3D", margin: "0 0 8px" }}>Đã gửi đơn tạm tính!</h2>
          <p style={{ margin: "0 0 8px" }}>
            Mã đơn: <strong>{successCode}</strong>
          </p>
          <p style={{ color: "#666", fontSize: 14, margin: 0 }}>
            Sale TPS1 sẽ kiểm tra phân loại khách, chốt đơn giá cuối và gửi PDF xác nhận trước khi thanh toán/giao hàng.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => router.push("/portal/don-hang")}
            style={{ marginTop: 20, width: "100%" }}
          >
            Xem đơn hàng của tôi
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ maxWidth: 440, margin: "0 auto" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "32px 24px",
            textAlign: "center",
            color: "#666",
            boxShadow: "0 4px 20px rgba(20,35,28,0.06)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(27,122,61,0.1)",
              color: "#1B7A3D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <ShoppingCart size={26} />
          </div>
          <p style={{ margin: 0 }}>Giỏ hàng đang trống.</p>
          <Link href="/san-pham" className="btn-primary" style={{ display: "inline-block", marginTop: 16 }}>
            Chọn sản phẩm
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
        {items.map((item) => (
          <div
            key={item.slug}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              background: "#fff",
              border: "1px solid #eee",
              borderRadius: 10,
              padding: "10px 14px",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "#666" }}>
                {item.summary} · {fmt((item.price || 0) * (1 - discountPercent / 100))}/đơn vị
              </div>
            </div>
            <input
              type="number"
              min={0.1}
              step="any"
              value={item.quantity}
              onChange={(e) => updateQty(item.slug, parseFloat(e.target.value) || 0)}
              style={{ width: 64, padding: 6, border: "1px solid #ddd", borderRadius: 6 }}
            />
            <button
              type="button"
              onClick={() => removeItem(item.slug)}
              style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}
            >
              Xoá
            </button>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <Row label="Tạm tính" value={fmt(subtotal)} />
        {discountPercent > 0 && (
          <Row label={`Giá đề xuất ${tier} (-${discountPercent}%)`} value={`-${fmt(subtotal - discountedTotal)}`} accent />
        )}
        <div style={{ borderTop: "1px solid #eee", marginTop: 8, paddingTop: 8 }}>
          <Row label="Tổng tạm tính" value={fmt(discountedTotal)} bold />
        </div>
        <p style={{ margin: "10px 0 0", padding: 10, borderRadius: 8, background: "#fffbeb", color: "#92400e", fontSize: 12 }}>
          Đơn giá cuối cùng chỉ có hiệu lực sau khi sale TPS1 xác nhận đơn.
        </p>
      </div>

      {defaultShippingAddress?.address && (
        <label
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            marginBottom: 14,
            padding: 12,
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 10,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={useDefaultAddress}
            onChange={(e) => {
              const checked = e.target.checked;
              setUseDefaultAddress(checked);
              if (checked) {
                setDeliveryAlias(defaultShippingAddress.alias || "");
                setDeliveryAddress(defaultShippingAddress.address || "");
                setDeliveryName(defaultShippingAddress.name || "");
                setDeliveryPhone(defaultShippingAddress.phone || "");
              } else {
                setDeliveryAlias("");
                setDeliveryAddress("");
                setDeliveryName("");
                setDeliveryPhone("");
              }
            }}
          />
          <span style={{ fontSize: 14 }}>
            <strong>Dùng địa chỉ giao mặc định</strong>
            <br />
            <span style={{ color: "#4b5563" }}>{defaultShippingAddress.address}</span>
          </span>
        </label>
      )}

      <div className="quote-landing__field">
        <label className="portal-form__label">Tên địa chỉ</label>
        <input
          className="lead-form__input"
          value={deliveryAlias}
          onChange={(e) => {
            setUseDefaultAddress(false);
            setDeliveryAlias(e.target.value);
          }}
          placeholder="Vd: Kho chính, Bếp ăn"
        />
      </div>

      <div className="quote-landing__field">
        <label className="portal-form__label">Địa chỉ giao hàng</label>
        <textarea
          className="lead-form__textarea"
          value={deliveryAddress}
          onChange={(e) => {
            setUseDefaultAddress(false);
            setDeliveryAddress(e.target.value);
          }}
          placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố"
          rows={2}
          required
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="quote-landing__field">
          <label className="portal-form__label">Người nhận</label>
          <input
            className="lead-form__input"
            value={deliveryName}
            onChange={(e) => {
              setUseDefaultAddress(false);
              setDeliveryName(e.target.value);
            }}
          />
        </div>
        <div className="quote-landing__field">
          <label className="portal-form__label">SĐT nhận hàng</label>
          <input
            className="lead-form__input"
            type="tel"
            value={deliveryPhone}
            onChange={(e) => {
              setUseDefaultAddress(false);
              setDeliveryPhone(e.target.value);
            }}
          />
        </div>
      </div>

      <div className="quote-landing__field">
        <label className="portal-form__label">Ghi chú</label>
        <textarea
          className="lead-form__textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ghi chú thêm cho đơn hàng (nếu có)"
          rows={3}
        />
      </div>

      {error && <p className="lead-form__error">{error}</p>}

      <button
        type="button"
        className="btn-primary"
        onClick={handleSubmit}
        disabled={submitting}
        style={{ width: "100%", marginTop: 8 }}
      >
        {submitting ? "Đang gửi đơn..." : "Đặt hàng"}
      </button>
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: bold ? 16 : 14,
        fontWeight: bold ? 700 : 400,
        color: accent ? "#1B7A3D" : "#111",
        marginBottom: 4,
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
