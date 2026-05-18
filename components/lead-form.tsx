"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, Send } from "lucide-react";
import { leadSchema, type LeadInput } from "@/lib/validation";

type LeadFormProps = {
  mode: "contact" | "quote";
};

export function LeadForm({ mode }: LeadFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: "",
      phone: "",
      company: "",
      message: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const res = await fetch(mode === "quote" ? "/api/quote" : "/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (res.ok) {
      setSubmitted(true);
      reset();
    }
  });

  if (submitted) {
    return (
      <div className="lead-form lead-form--success">
        <div className="lead-form__success-badge">
          <Sparkles size={16} />
          Đã nhận thông tin
        </div>
        <p className="lead-form__success-title">Đã nhận thông tin của bạn.</p>
        <p className="lead-form__success-copy">
          Đội ngũ sẽ kiểm tra nhu cầu và phản hồi lại theo số điện thoại hoặc email đã cung cấp.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="lead-form">
      <div className="lead-form__header">
        <div className="pill">Yêu cầu tư vấn</div>
        <p>Để lại thông tin, đội ngũ sẽ phản hồi theo nhu cầu báo giá hoặc liên hệ của bạn.</p>
      </div>

      <div className="lead-form__grid">
        <Field label="Họ tên" error={errors.name?.message} {...register("name")} />
        <Field label="Số điện thoại" error={errors.phone?.message} {...register("phone")} />
      </div>

      <Field label="Công ty" error={errors.company?.message} {...register("company")} />

      <div>
        <label className="lead-form__label">Nhu cầu</label>
        <textarea
          {...register("message")}
          rows={5}
          className="lead-form__textarea"
          placeholder="Mô tả loại hàng, số lượng, lịch giao, khu vực"
        />
        {errors.message?.message ? <p className="lead-form__error">{errors.message.message}</p> : null}
      </div>

      <button disabled={isSubmitting} className="btn-primary lead-form__button">
        {isSubmitting ? "Đang gửi..." : mode === "quote" ? "Gửi yêu cầu báo giá" : "Gửi liên hệ"}
        <Send size={18} />
      </button>
    </form>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

function Field({ label, error, ...props }: FieldProps) {
  return (
    <div>
      <label className="lead-form__label">{label}</label>
      <input {...props} className="lead-form__input" />
      {error ? <p className="lead-form__error">{error}</p> : null}
    </div>
  );
}
