"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { PortalPasswordField } from "@/components/portal-password-field";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/portal";

  const [form, setForm] = useState({
    name: "",
    phone: "",
    company: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [field]: val }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.phone.trim()) {
      setError("Vui lòng nhập họ tên và số điện thoại");
      return;
    }
    if (form.password.length < 8) {
      setError("Mật khẩu tối thiểu 8 ký tự");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu xác nhận chưa khớp");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "website" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Không đăng ký được tài khoản");
        return;
      }

      const code = String(data.account.code);
      // Redirect to login page pre-filling the code
      router.push(
        `/portal/dang-nhap?redirect=${encodeURIComponent(redirect)}&code=${encodeURIComponent(code)}&registered=1`
      );
    } catch {
      setError("Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 440, margin: "0 auto" }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "28px 24px",
          boxShadow: "0 4px 20px rgba(20,35,28,0.06)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(27,122,61,0.1)",
            color: "#1B7A3D",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <UserPlus size={22} />
        </div>

        <p style={{ color: "#666", fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 1.6 }}>
          Tạo tài khoản để xem giá chiết khấu riêng, đặt hàng và theo dõi đơn hàng của bạn.
        </p>

        <div className="quote-landing__field">
          <label className="portal-form__label">Họ và tên *</label>
          <input
            className="lead-form__input"
            value={form.name}
            onChange={(e) => set("name")(e.target.value)}
            placeholder="Nguyễn Văn A"
            required
          />
        </div>

        <div className="quote-landing__field">
          <label className="portal-form__label">Số điện thoại *</label>
          <input
            className="lead-form__input"
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone")(e.target.value)}
            placeholder="0901234567"
            required
          />
        </div>

        <div className="quote-landing__field">
          <label className="portal-form__label">Tên công ty / bếp ăn</label>
          <input
            className="lead-form__input"
            value={form.company}
            onChange={(e) => set("company")(e.target.value)}
            placeholder="Công ty TNHH ABC (không bắt buộc)"
          />
        </div>

        <div className="quote-landing__field">
          <label className="portal-form__label">Email</label>
          <input
            className="lead-form__input"
            type="email"
            value={form.email}
            onChange={(e) => set("email")(e.target.value)}
            placeholder="email@example.com (không bắt buộc)"
          />
        </div>

        <PortalPasswordField
          label="Mật khẩu *"
          value={form.password}
          onChange={set("password")}
          placeholder="Tối thiểu 8 ký tự"
          autoComplete="new-password"
        />

        <PortalPasswordField
          label="Xác nhận mật khẩu *"
          value={form.confirmPassword}
          onChange={set("confirmPassword")}
          placeholder="Nhập lại mật khẩu"
          autoComplete="new-password"
        />

        {error && <p className="lead-form__error">{error}</p>}

        <button
          type="submit"
          className="btn-primary"
          disabled={submitting}
          style={{ width: "100%", marginTop: 12 }}
        >
          {submitting ? "Đang đăng ký..." : "Tạo tài khoản"}
        </button>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#64748b" }}>
          Đã có tài khoản?{" "}
          <Link
            href={`/portal/dang-nhap?redirect=${encodeURIComponent(redirect)}`}
            style={{ color: "#147a52", fontWeight: 700 }}
          >
            Đăng nhập
          </Link>
        </p>
      </form>
    </div>
  );
}
