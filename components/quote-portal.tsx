"use client";

import {
  useEffect,
  useState,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, Sparkles } from "lucide-react";
import { leadSchema, type LeadInput } from "@/lib/validation";
import { siteConfig } from "@/lib/site";

const facilityOptions = [
  "Bếp ăn tập thể",
  "Nhà máy / KCN",
  "Trường học",
  "Bệnh viện",
  "Nhà hàng / Khách sạn",
  "Đại lý / Nhà phân phối",
  "Khác",
];

const interestOptions = [
  "Rau củ quả",
  "Thịt cá hải sản",
  "Hàng đông lạnh",
  "Gia vị / Khô / Gia dụng",
  "Thực phẩm chay",
  "Tất cả nhóm hàng",
];

const scaleOptions = [
  "Dưới 50 suất/ngày",
  "50 - 100 suất/ngày",
  "100 - 300 suất/ngày",
  "300 - 500 suất/ngày",
  "Trên 500 suất/ngày",
];

const frequencyOptions = ["Hàng ngày", "2 - 3 lần/tuần", "Theo tuần", "Theo tháng", "Theo nhu cầu"];
const LAST_SUCCESS_KEY = "tps1-quote-last-success-v1";
const LAST_NOTICE_KEY = "tps1-quote-last-notice-v1";
const SUCCESS_TITLE = "Cảm ơn anh/chị đã gửi yêu cầu báo giá.";
const SUCCESS_COPY =
  "Phòng Kinh Doanh đã ghi nhận thông tin. Chúng tôi sẽ liên hệ lại sớm nhất theo khu vực, nhóm hàng và nhu cầu anh/chị đã chọn.";
const ERROR_TITLE = "Xin lỗi, chúng tôi chưa gửi được yêu cầu của anh/chị.";
const ERROR_COPY = "Vui lòng liên hệ hotline để được hỗ trợ ngay: ";

type QuoteSummary = {
  name: string;
  facilityType: string;
  interestedIn: string;
  deliveryArea: string;
};

type QuoteNotice =
  | {
      kind: "success";
      summary: QuoteSummary;
    }
  | {
      kind: "error";
      message: string;
    };

type QuotePortalProps = {
  initialNotice?: QuoteNotice | null;
};

export function QuotePortal({ initialNotice = null }: QuotePortalProps) {
  const initialSummary = initialNotice?.kind === "success" ? initialNotice.summary : readLastSuccessState();
  const [submittedSummary, setSubmittedSummary] = useState<QuoteSummary | null>(initialSummary);
  const [submitted, setSubmitted] = useState(Boolean(initialSummary));
  const [submitError, setSubmitError] = useState<string | null>(
    initialNotice?.kind === "error" ? initialNotice.message : null,
  );
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (initialNotice?.kind === "success") {
      saveSuccessState(initialNotice.summary);
      return;
    }

    if (initialNotice?.kind === "error") {
      saveNoticeState(initialNotice);
      return;
    }

    const storedSummary = readLastSuccessState();
    if (storedSummary) {
      setSubmittedSummary(storedSummary);
      setSubmitted(true);
    }

    const storedNotice = readLastNoticeState();
    if (storedNotice?.kind === "error") {
      setSubmitError(storedNotice.message);
    }
  }, [initialNotice]);

  function saveSuccessState(summary: QuoteSummary) {
    try {
      window.localStorage.setItem(LAST_SUCCESS_KEY, JSON.stringify(summary));
      window.localStorage.removeItem(LAST_NOTICE_KEY);
    } catch {
      // Ignore localStorage write failures.
    }
  }

  function saveNoticeState(notice: QuoteNotice) {
    try {
      window.localStorage.setItem(LAST_NOTICE_KEY, JSON.stringify(notice));
    } catch {
      // Ignore localStorage write failures.
    }
  }

  const {
    register,
    trigger,
    getValues,
    reset,
    formState: { errors },
  } = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: "",
      phone: "",
      company: "",
      facilityType: "",
      interestedIn: "",
      purchaseScale: "",
      deliveryFrequency: "",
      deliveryArea: "",
      needBy: "",
      email: "",
      message: "",
      selectedItems: [],
    },
  });

  const submitLead = async () => {
    setSubmitError(null);
    setSubmitted(false);
    setIsSending(true);

    const isValid = await trigger();
    if (!isValid) {
      setIsSending(false);
      return;
    }

    const values = getValues();

    const payload = {
      ...values,
      selectedItems: [],
      message: [
        values.message,
        `Loại hình đơn vị: ${values.facilityType}`,
        `Nhóm hàng quan tâm: ${values.interestedIn}`,
        `Quy mô nhu cầu: ${values.purchaseScale}`,
        `Tần suất giao: ${values.deliveryFrequency}`,
      ]
        .filter(Boolean)
        .join("\n"),
    };

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = "Xin lỗi, chúng tôi chưa gửi được yêu cầu của anh/chị. Vui lòng liên hệ hotline để được hỗ trợ ngay.";
        setSubmitError(message);
        saveNoticeState({ kind: "error", message });
        return;
      }

      const responseBody = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (!responseBody?.ok) {
        const message = "Xin lỗi, chúng tôi chưa ghi nhận được yêu cầu. Vui lòng liên hệ hotline để được hỗ trợ ngay.";
        setSubmitError(message);
        saveNoticeState({ kind: "error", message });
        return;
      }
    } catch {
      const message = "Xin lỗi, đã có lỗi khi gửi yêu cầu. Vui lòng liên hệ hotline để được hỗ trợ ngay.";
      setSubmitError(message);
      saveNoticeState({ kind: "error", message });
      return;
    } finally {
      setIsSending(false);
    }

    const summary = {
      name: values.name,
      facilityType: values.facilityType,
      interestedIn: values.interestedIn,
      deliveryArea: values.deliveryArea,
    };

    setSubmittedSummary(summary);
    saveSuccessState(summary);
    reset();
    setSubmitted(true);
  };

  return (
    <form
      className="quote-landing__form quote-landing__form--solo"
      method="post"
      action="/api/quote"
      onSubmit={(event) => {
        event.preventDefault();
        void submitLead();
      }}
    >
      <div className="quote-landing__form-head">
        <div className="portal-form__eyebrow">Gửi yêu cầu báo giá</div>
        <p>
          Điền nhanh theo 3 bước: thông tin liên hệ, nhu cầu mua, khu vực giao. Càng đủ, sale càng phản hồi đúng hẹn.
        </p>
        <div className="quote-landing__steps">
          <span>1. Điền thông tin liên hệ</span>
          <span>2. Chọn nhu cầu chính</span>
          <span>3. Gửi yêu cầu để sale gọi lại</span>
        </div>
      </div>

      <div className="quote-landing__grid">
        <Field label="Họ tên" error={errors.name?.message} {...register("name")} />
        <Field label="Số điện thoại" error={errors.phone?.message} {...register("phone")} />
      </div>

      <div className="quote-landing__grid">
        <Field label="Công ty / Đơn vị" error={errors.company?.message} {...register("company")} />
        <Field label="Email" error={errors.email?.message} {...register("email")} />
      </div>

      <div className="quote-landing__grid">
        <SelectField label="Loại hình đơn vị" error={errors.facilityType?.message} {...register("facilityType")}>
          <option value="">Chọn loại hình</option>
          {facilityOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </SelectField>
        <SelectField label="Nhóm hàng quan tâm" error={errors.interestedIn?.message} {...register("interestedIn")}>
          <option value="">Chọn nhóm hàng</option>
          {interestOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="quote-landing__grid">
        <SelectField label="Quy mô nhu cầu" error={errors.purchaseScale?.message} {...register("purchaseScale")}>
          <option value="">Chọn quy mô</option>
          {scaleOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Tần suất giao"
          error={errors.deliveryFrequency?.message}
          {...register("deliveryFrequency")}
        >
          <option value="">Chọn tần suất</option>
          {frequencyOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="quote-landing__grid">
        <Field label="Khu vực giao" error={errors.deliveryArea?.message} {...register("deliveryArea")} />
        <Field label="Cần phản hồi trước" error={errors.needBy?.message} {...register("needBy")} />
      </div>

      <TextAreaField
        label="Mô tả nhu cầu"
        error={errors.message?.message}
        {...register("message")}
        rows={5}
        placeholder="Mô tả sơ bộ nhu cầu: nhóm hàng cần mua, số lượng, lịch giao, quy cách đóng gói, ngân sách hoặc điều kiện đặc biệt"
      />

      <button type="submit" disabled={isSending} className="btn-primary quote-landing__submit">
        {isSending ? "Đang gửi..." : "Gửi yêu cầu báo giá"}
        <Send size={18} />
      </button>

      <p className="quote-landing__note">
        Thông tin sẽ được chuyển qua Phòng Kinh Doanh để bộ phận sale liên hệ lại theo khu vực, nhóm hàng và nhu cầu
        anh/chị đã chọn.
      </p>

      {submitted ? (
        <div className="portal-submit-status portal-submit-status--success" aria-live="polite">
          <div className="portal-submit-status__badge">
            <Sparkles size={16} />
            Gửi thành công
          </div>
          <strong>{SUCCESS_TITLE}</strong>
          <p>{SUCCESS_COPY}</p>
          {submittedSummary ? (
            <div className="portal-submit-status__summary">
              <span>Lead vừa gửi:</span>
              <strong>
                {submittedSummary.name} · {submittedSummary.facilityType} · {submittedSummary.interestedIn} ·{" "}
                {submittedSummary.deliveryArea}
              </strong>
            </div>
          ) : null}
        </div>
      ) : null}

      {submitError ? (
        <div className="portal-submit-status portal-submit-status--error" aria-live="polite">
          <strong>{ERROR_TITLE}</strong>
          <p>{submitError}</p>
          <a className="btn-secondary" href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`}>
            {ERROR_COPY}
            {siteConfig.phone}
          </a>
        </div>
      ) : null}
    </form>
  );
}

function readLastSuccessState(): QuoteSummary | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LAST_SUCCESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QuoteSummary>;

    if (parsed?.name && parsed?.facilityType && parsed?.interestedIn && parsed?.deliveryArea) {
      return {
        name: parsed.name,
        facilityType: parsed.facilityType,
        interestedIn: parsed.interestedIn,
        deliveryArea: parsed.deliveryArea,
      };
    }
  } catch {
    // Ignore malformed local state and continue with a clean form.
  }

  return null;
}

function readLastNoticeState(): QuoteNotice | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LAST_NOTICE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuoteNotice;
    if (parsed?.kind === "error" && parsed.message) {
      return parsed;
    }
  } catch {
    // Ignore malformed local state and continue with a clean form.
  }

  return null;
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

function Field({ label, error, ...props }: FieldProps) {
  return (
    <div className="quote-landing__field">
      <label className="portal-form__label">{label}</label>
      <input {...props} className="lead-form__input" />
      {error ? <p className="lead-form__error">{error}</p> : null}
    </div>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
};

function SelectField({ label, error, children, ...props }: SelectFieldProps) {
  return (
    <div className="quote-landing__field">
      <label className="portal-form__label">{label}</label>
      <select {...props} className="lead-form__input">
        {children}
      </select>
      {error ? <p className="lead-form__error">{error}</p> : null}
    </div>
  );
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

function TextAreaField({ label, error, ...props }: TextAreaFieldProps) {
  return (
    <div className="quote-landing__field">
      <label className="portal-form__label">{label}</label>
      <textarea {...props} className="lead-form__textarea" />
      {error ? <p className="lead-form__error">{error}</p> : null}
    </div>
  );
}
