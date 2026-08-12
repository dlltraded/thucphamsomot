"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function PortalPasswordField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: "current-password" | "new-password";
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="quote-landing__field">
      <label className="portal-form__label">{label}</label>
      <div style={{ position: "relative" }}>
        <input
          className="lead-form__input"
          style={{ paddingRight: 48 }}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          spellCheck={false}
          autoCapitalize="none"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
          title={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            width: 34,
            height: 34,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: 0,
            borderRadius: 8,
            background: "transparent",
            color: "#64748b",
            cursor: "pointer",
          }}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
