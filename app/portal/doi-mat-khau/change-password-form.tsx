"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { PortalPasswordField } from "@/components/portal-password-field";

export function ChangePasswordForm({ code, forced }: { code: string; forced: boolean }) {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!oldPassword) {
      setError("Vui lòng nhập mật khẩu hiện tại");
      return;
    }
    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải từ 6 ký tự trở lên");
      return;
    }
    if (newPassword !== newPassword.trim()) {
      setError("Mật khẩu mới không được có khoảng trắng ở đầu hoặc cuối");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu không khớp");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/customer/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "Không đổi được mật khẩu, vui lòng thử lại");
        return;
      }

      router.push("/portal");
      router.refresh();
    } catch {
      setError("Không đổi được mật khẩu, vui lòng thử lại");
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
        <ShieldCheck size={22} />
      </div>

      <p style={{ color: "#666", fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 1.6 }}>
        {forced ? (
          <>
            Đây là lần đăng nhập đầu tiên của mã khách hàng{" "}
            <strong>{code}</strong>. Vui lòng đặt mật khẩu mới theo ý bạn để
            tiếp tục.
          </>
        ) : (
          <>
            Đổi mật khẩu cho mã khách hàng <strong>{code}</strong>.
          </>
        )}
      </p>

      <PortalPasswordField
        label="Mật khẩu hiện tại"
        value={oldPassword}
        onChange={setOldPassword}
        placeholder="Nhập mật khẩu hiện tại"
        autoComplete="current-password"
      />

      <PortalPasswordField
        label="Mật khẩu mới"
        value={newPassword}
        onChange={setNewPassword}
        placeholder="Ít nhất 6 ký tự"
        autoComplete="new-password"
      />

      <PortalPasswordField
        label="Xác nhận mật khẩu mới"
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder="Nhập lại mật khẩu mới"
        autoComplete="new-password"
      />

      <p style={{ margin: "-4px 0 10px", color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>
        Mật khẩu phân biệt chữ hoa và chữ thường, không dùng khoảng trắng ở đầu hoặc cuối.
      </p>

      {error && <p className="lead-form__error">{error}</p>}

      <button type="submit" className="btn-primary" disabled={submitting} style={{ width: "100%", marginTop: 12 }}>
        {submitting ? "Đang lưu..." : "Đặt mật khẩu mới"}
      </button>
    </form>
    </div>
  );
}
