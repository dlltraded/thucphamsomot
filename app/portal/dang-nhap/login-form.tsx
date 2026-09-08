"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { PortalPasswordField } from "@/components/portal-password-field";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/portal";
  const registered = searchParams.get("registered") === "1";

  const [code, setCode] = useState(searchParams.get("code") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!code.trim() || !password) {
      setError("Vui lòng nhập đầy đủ Mã khách hàng và Mật khẩu");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "Đăng nhập thất bại, vui lòng thử lại");
        return;
      }

      if (data.session?.mustChangePassword) {
        router.push("/portal/doi-mat-khau");
      } else {
        router.push(redirectTo);
      }
      router.refresh();
    } catch {
      setError("Không thể đăng nhập lúc này, vui lòng thử lại");
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
          <KeyRound size={22} />
        </div>

        {registered && (
          <div
            style={{
              marginBottom: 18,
              padding: "10px 14px",
              borderRadius: 10,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#166534",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            🎉 Đăng ký thành công! Mã khách hàng đã được điền sẵn. Nhập mật khẩu vừa tạo để tiếp tục.
          </div>
        )}

        {!registered && (
          <p style={{ color: "#666", fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 1.6 }}>
            Nhập Mã khách hàng và Mật khẩu để xem giá chiết khấu riêng, đặt hàng và quản lý đơn hàng.
          </p>
        )}

        <div className="quote-landing__field">
          <label className="portal-form__label">Mã khách hàng</label>
          <input
            className="lead-form__input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="TPS1-XXXX"
            autoCapitalize="characters"
          />
        </div>

        <PortalPasswordField
          label="Mật khẩu"
          value={password}
          onChange={setPassword}
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
        />

        <p style={{ margin: "-4px 0 10px", color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>
          Mật khẩu phân biệt chữ hoa và chữ thường. Dùng biểu tượng con mắt để kiểm tra trước khi đăng nhập.
        </p>

        {error && <p className="lead-form__error">{error}</p>}

        <button
          type="submit"
          className="btn-primary"
          disabled={submitting}
          style={{ width: "100%", marginTop: 12 }}
        >
          {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#64748b" }}>
          Chưa có tài khoản?{" "}
          <Link
            href={`/portal/dang-ky?redirect=${encodeURIComponent(redirectTo)}`}
            style={{ color: "#147a52", fontWeight: 700 }}
          >
            Đăng ký ngay
          </Link>
        </p>
      </form>
    </div>
  );
}
