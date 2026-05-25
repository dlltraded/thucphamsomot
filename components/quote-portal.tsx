"use client";

import { useEffect, useState, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Mail, Send, Sparkles } from "lucide-react";
import { quoteSchema, type QuoteLeadInput } from "@/lib/validation";
import { siteConfig } from "@/lib/site";

type InquiryType = "buyer" | "supplier";

type OptionItem = {
  value: string;
  label: string;
};

const supplierFormUrl = "/documents/Pre-qualification-form.xlsx";
const supplierMailTo = "phongthumua@thucphamsomot.vn";

const buyerFacilityOptions: OptionItem[] = [
  { value: "canteen", label: "Bếp ăn tập thể / Canteen" },
  { value: "factory", label: "Nhà máy / KCN / Factory / Industrial zone" },
  { value: "school", label: "Trường học / School" },
  { value: "hospital", label: "Bệnh viện / Hospital" },
  { value: "hotel", label: "Nhà hàng / Khách sạn / Restaurant / Hotel" },
  { value: "distributor", label: "Đại lý / Nhà phân phối / Dealer / Distributor" },
  { value: "other", label: "Khác / Other" },
];

const buyerInterestOptions: OptionItem[] = [
  { value: "produce", label: "Rau củ quả / Produce" },
  { value: "meat-seafood", label: "Thịt cá hải sản / Meat / Seafood" },
  { value: "frozen", label: "Hàng đông lạnh / Frozen goods" },
  { value: "dry-grocery", label: "Gia vị / Khô / Gia dụng / Seasoning / Dry goods / Household" },
  { value: "vegetarian", label: "Thực phẩm chay / Vegetarian food" },
  { value: "all", label: "Tất cả nhóm hàng / All categories" },
];

const buyerScaleOptions: OptionItem[] = [
  { value: "lt50", label: "Dưới 50 suất/ngày / Under 50 meals/day" },
  { value: "50-100", label: "50 - 100 suất/ngày / 50 - 100 meals/day" },
  { value: "100-300", label: "100 - 300 suất/ngày / 100 - 300 meals/day" },
  { value: "300-500", label: "300 - 500 suất/ngày / 300 - 500 meals/day" },
  { value: "gt500", label: "Trên 500 suất/ngày / Over 500 meals/day" },
];

const buyerFrequencyOptions: OptionItem[] = [
  { value: "daily", label: "Hàng ngày / Daily" },
  { value: "2-3-week", label: "2 - 3 lần/tuần / 2 - 3 times/week" },
  { value: "weekly", label: "Theo tuần / Weekly" },
  { value: "monthly", label: "Theo tháng / Monthly" },
  { value: "as-needed", label: "Theo nhu cầu / As needed" },
];

const UI = {
  eyebrow: "Gửi nhu cầu hoặc chào hàng / Buying need or supplier pitch",
  leadBuyer:
    "Chọn vai trò phù hợp, rồi điền form online như bình thường. / Choose the buyer role, then complete the online form as usual.",
  leadSupplier:
    "Chọn vai trò nhà cung cấp để tải form, điền offline và gửi về email mua hàng. / Choose the supplier role to download the form, fill it offline, and email purchasing.",
  roleBuyer: "Người mua / Buyer",
  roleBuyerDesc: "Gửi nhu cầu đặt hàng, báo giá, lịch giao. / Send purchase needs, quotes, and delivery schedule.",
  roleSupplier: "Nhà cung cấp / Supplier",
  roleSupplierDesc: "Tải form pre-qualification, điền xong gửi email. / Download the pre-qualification form, complete it, and email it.",
  buyerSteps: ["1. Chọn vai trò / Choose role", "2. Điền form online / Fill online form", "3. Gửi yêu cầu / Send request"],
  supplierSteps: ["1. Chọn vai trò / Choose role", "2. Tải form / Download form", "3. Gửi email / Send email"],
  buyerSubmit: "Gửi yêu cầu báo giá / Send quote request",
  buyerNote:
    "Thông tin sẽ được chuyển qua Phòng Kinh Doanh để liên hệ lại theo khu vực giao, nhóm hàng và quy mô nhu cầu anh/chị đã chọn. / Sales will follow up based on delivery area, product group, and volume.",
  buyerSuccessTitle: "Phòng Kinh Doanh đã ghi nhận nhu cầu mua hàng. / Sales has received the buying request.",
  buyerSuccessCopy:
    "Chúng tôi sẽ liên hệ lại theo khu vực giao, nhóm hàng và quy mô nhu cầu anh/chị đã chọn. / We will contact you based on the delivery area, product group, and volume you selected.",
  errorTitle: "Xin lỗi, chúng tôi chưa gửi được yêu cầu của anh/chị. / Sorry, we could not send your request.",
  errorCopy: "Vui lòng liên hệ hotline để được hỗ trợ ngay: / Please call the hotline for immediate help: ",
  summaryIntro: "Lead vừa gửi / Latest submission:",
  supplier: {
    title: "Dành cho nhà cung cấp / For suppliers",
    lead:
      "Vui lòng tải form pre-qualification bên dưới, điền đầy đủ và gửi về phongthumua@thucphamsomot.vn để báo giá. / Please download the pre-qualification form below, complete it, and email it to phongthumua@thucphamsomot.vn for a quote.",
    step1: "1. Tải form / Download form",
    step2: "2. Điền đầy đủ / Complete it",
    step3: "3. Gửi email / Send by email",
    download: "Tải form Excel / Download Excel form",
    email: "Gửi email báo giá / Send quote by email",
    emailHint: "Gửi tới: phongthumua@thucphamsomot.vn / To: phongthumua@thucphamsomot.vn",
  },
  common: {
    name: "Họ tên / Full name",
    phone: "Số điện thoại / Phone number",
    company: "Công ty / Đơn vị / Company / Organization",
    email: "Email / Email",
    companyFallback: "Chưa ghi công ty / No company listed",
    buyerRoleSummary: "Người mua / Buyer",
    supplierRoleSummary: "Nhà cung cấp / Supplier",
    deliveryArea: "Khu vực giao / Delivery area",
    notProvided: "chưa ghi / not provided",
  },
  buyer: {
    facilityType: "Loại hình đơn vị / Facility type",
    interestedIn: "Nhóm hàng quan tâm / Product group",
    purchaseScale: "Quy mô nhu cầu / Demand volume",
    deliveryFrequency: "Tần suất giao / Delivery frequency",
    deliveryArea: "Khu vực giao / Delivery area",
    needBy: "Cần phản hồi trước / Need response by",
    messageLabel: "Mô tả nhu cầu / Buying needs",
    messagePlaceholder:
      "Mô tả nhóm hàng cần mua, số lượng, lịch giao, quy cách đóng gói, ngân sách hoặc điều kiện đặc biệt. / Share product group, quantity, delivery schedule, packaging, budget, or special requirements.",
  },
} as const;

const LAST_SUCCESS_KEY = "tps1-quote-last-success-v5";
const LAST_NOTICE_KEY = "tps1-quote-last-notice-v5";

type QuoteSummary = {
  name: string;
  company: string;
  inquiryType: InquiryType;
  primaryNeed: string;
  secondaryNeed: string;
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
  const initialStoredNotice =
    initialNotice?.kind === "success" ? null : initialNotice?.kind === "error" ? initialNotice : readLastNoticeState();

  const [submittedSummary, setSubmittedSummary] = useState<QuoteSummary | null>(initialSummary);
  const [submitted, setSubmitted] = useState(Boolean(initialSummary));
  const [submitError, setSubmitError] = useState<string | null>(
    initialStoredNotice?.kind === "error" ? initialStoredNotice.message : null,
  );
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (initialNotice?.kind === "success") {
      saveSuccessState(initialNotice.summary);
      return;
    }

    if (initialNotice?.kind === "error") {
      saveNoticeState(initialNotice);
    }
  }, [initialNotice]);

  const {
    register,
    trigger,
    getValues,
    reset,
    control,
    formState: { errors },
  } = useForm<QuoteLeadInput>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      inquiryType: "buyer",
      name: "",
      phone: "",
      company: "",
      email: "",
      message: "",
      facilityType: "",
      interestedIn: "",
      purchaseScale: "",
      deliveryFrequency: "",
      deliveryArea: "",
      needBy: "",
      supplierType: "",
      offeredProducts: "",
      supplyCapacity: "",
      supplyArea: "",
      certifications: "",
      selectedItems: [],
    },
  });

  const inquiryType = (useWatch({ control, name: "inquiryType" }) ?? "buyer") as InquiryType;
  const isSupplier = inquiryType === "supplier";
  const steps = isSupplier ? UI.supplierSteps : UI.buyerSteps;
  const lead = isSupplier ? UI.leadSupplier : UI.leadBuyer;

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
      message: buildMessage(values),
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
        const message = "Xin lỗi, chúng tôi chưa gửi được yêu cầu của anh/chị. / Sorry, we could not send your request.";
        setSubmitError(message);
        saveNoticeState({ kind: "error", message });
        return;
      }

      const responseBody = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (!responseBody?.ok) {
        const message = "Xin lỗi, chúng tôi chưa ghi nhận được yêu cầu. / Sorry, we could not record your request.";
        setSubmitError(message);
        saveNoticeState({ kind: "error", message });
        return;
      }
    } catch {
      const message = "Xin lỗi, đã có lỗi khi gửi yêu cầu. / Sorry, there was an error while sending the request.";
      setSubmitError(message);
      saveNoticeState({ kind: "error", message });
      return;
    } finally {
      setIsSending(false);
    }

    const summary = buildSummary(values);
    setSubmittedSummary(summary);
    saveSuccessState(summary);
    reset({
      inquiryType: values.inquiryType,
      name: "",
      phone: "",
      company: "",
      email: "",
      message: "",
      facilityType: "",
      interestedIn: "",
      purchaseScale: "",
      deliveryFrequency: "",
      deliveryArea: "",
      needBy: "",
      supplierType: "",
      offeredProducts: "",
      supplyCapacity: "",
      supplyArea: "",
      certifications: "",
      selectedItems: [],
    });
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
        <div className="portal-form__eyebrow">{UI.eyebrow}</div>
        <p>{lead}</p>
        <div className="quote-landing__steps">
          {steps.map((step) => (
            <span key={step}>{step}</span>
          ))}
        </div>
      </div>

      <div className="quote-landing__role-grid">
        <label className={`quote-landing__role-card${!isSupplier ? " is-active" : ""}`}>
          <span className="quote-landing__role-card-head">
            <input type="radio" value="buyer" {...register("inquiryType")} />
            <strong>{UI.roleBuyer}</strong>
          </span>
          <span>{UI.roleBuyerDesc}</span>
        </label>
        <label className={`quote-landing__role-card${isSupplier ? " is-active" : ""}`}>
          <span className="quote-landing__role-card-head">
            <input type="radio" value="supplier" {...register("inquiryType")} />
            <strong>{UI.roleSupplier}</strong>
          </span>
          <span>{UI.roleSupplierDesc}</span>
        </label>
      </div>

      {isSupplier ? (
        <div className="quote-landing__supplier-panel">
          <div className="quote-landing__supplier-header">
            <div className="portal-form__eyebrow">{UI.supplier.title}</div>
            <p>{UI.supplier.lead}</p>
          </div>

          <div className="quote-landing__supplier-steps">
            <span>{UI.supplier.step1}</span>
            <span>{UI.supplier.step2}</span>
            <span>{UI.supplier.step3}</span>
          </div>

          <div className="quote-landing__supplier-actions">
            <a className="btn-primary" href={supplierFormUrl} download>
              <Download size={18} />
              {UI.supplier.download}
            </a>
            <a className="btn-secondary" href={`mailto:${supplierMailTo}?subject=${encodeURIComponent("Báo giá / Pre-qualification form")}`}>
              <Mail size={18} />
              {UI.supplier.email}
            </a>
          </div>

          <p className="quote-landing__supplier-hint">Không cần điền form trên web / No need to fill the web form.</p>
          <p className="quote-landing__supplier-hint">{UI.supplier.emailHint}</p>
        </div>
      ) : (
        <>
          <div className="quote-landing__grid">
            <Field label={UI.common.name} error={errors.name?.message} {...register("name")} />
            <Field label={UI.common.phone} error={errors.phone?.message} {...register("phone")} />
          </div>

          <div className="quote-landing__grid">
            <Field label={UI.common.company} error={errors.company?.message} {...register("company")} />
            <Field label={UI.common.email} error={errors.email?.message} {...register("email")} />
          </div>

          <div className="quote-landing__grid">
            <SelectField label={UI.buyer.facilityType} error={errors.facilityType?.message} {...register("facilityType")}>
              <option value="">-</option>
              {buyerFacilityOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </SelectField>
            <SelectField label={UI.buyer.interestedIn} error={errors.interestedIn?.message} {...register("interestedIn")}>
              <option value="">-</option>
              {buyerInterestOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="quote-landing__grid">
            <SelectField label={UI.buyer.purchaseScale} error={errors.purchaseScale?.message} {...register("purchaseScale")}>
              <option value="">-</option>
              {buyerScaleOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </SelectField>
            <SelectField
              label={UI.buyer.deliveryFrequency}
              error={errors.deliveryFrequency?.message}
              {...register("deliveryFrequency")}
            >
              <option value="">-</option>
              {buyerFrequencyOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="quote-landing__grid">
            <Field label={UI.buyer.deliveryArea} error={errors.deliveryArea?.message} {...register("deliveryArea")} />
            <Field label={UI.buyer.needBy} error={errors.needBy?.message} {...register("needBy")} />
          </div>

          <TextAreaField
            label={UI.buyer.messageLabel}
            error={errors.message?.message}
            {...register("message")}
            rows={5}
            placeholder={UI.buyer.messagePlaceholder}
          />

          <button type="submit" disabled={isSending} className="btn-primary quote-landing__submit">
            {isSending ? "Đang gửi... / Sending..." : UI.buyerSubmit}
            <Send size={18} />
          </button>

          <p className="quote-landing__note">{UI.buyerNote}</p>

          {submitted ? (
            <div className="portal-submit-status portal-submit-status--success" aria-live="polite">
              <div className="portal-submit-status__badge">
                <Sparkles size={16} />
                Gửi thành công / Success
              </div>
              <strong>{UI.buyerSuccessTitle}</strong>
              <p>{UI.buyerSuccessCopy}</p>
              {submittedSummary ? (
                <div className="portal-submit-status__summary">
                  <span>{UI.summaryIntro}</span>
                  <strong>
                    {submittedSummary.name} · {submittedSummary.company} · {roleLabel(submittedSummary.inquiryType)} ·{" "}
                    {submittedSummary.primaryNeed}
                  </strong>
                  <p className="portal-submit-status__summary-note">{submittedSummary.secondaryNeed}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {submitError ? (
            <div className="portal-submit-status portal-submit-status--error" aria-live="polite">
              <strong>{UI.errorTitle}</strong>
              <p>{submitError}</p>
              <a className="btn-secondary" href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`}>
                {UI.errorCopy}
                {siteConfig.phone}
              </a>
            </div>
          ) : null}
        </>
      )}
    </form>
  );
}

function roleLabel(inquiryType: InquiryType) {
  return inquiryType === "supplier" ? UI.common.supplierRoleSummary : UI.common.buyerRoleSummary;
}

function buildSummary(values: QuoteLeadInput): QuoteSummary {
  const companyFallback = UI.common.companyFallback;

  return {
    name: values.name,
    company: values.company?.trim() || companyFallback,
    inquiryType: values.inquiryType,
    primaryNeed:
      values.inquiryType === "supplier" ? values.offeredProducts || "Chào hàng chưa ghi rõ" : values.interestedIn || "Nhóm hàng chưa ghi rõ",
    secondaryNeed:
      values.inquiryType === "supplier"
        ? values.supplyArea
          ? `${UI.common.deliveryArea}: ${values.supplyArea}`
          : `${UI.common.deliveryArea}: ${UI.common.notProvided}`
        : values.deliveryArea
          ? `${UI.common.deliveryArea}: ${values.deliveryArea}`
          : `${UI.common.deliveryArea}: ${UI.common.notProvided}`,
  };
}

function buildMessage(values: QuoteLeadInput) {
  const lines = [values.message];

  lines.push(
    "Vai trò / Role: Người mua / Buyer",
    `Loại hình đơn vị / Facility type: ${values.facilityType}`,
    `Nhóm hàng quan tâm / Product group: ${values.interestedIn}`,
    `Quy mô nhu cầu / Demand volume: ${values.purchaseScale}`,
    `Tần suất giao / Delivery frequency: ${values.deliveryFrequency}`,
    `Khu vực giao / Delivery area: ${values.deliveryArea}`,
    `Cần phản hồi trước / Need response by: ${values.needBy}`,
  );

  return lines.filter(Boolean).join("\n");
}

function saveSuccessState(summary: QuoteSummary) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LAST_SUCCESS_KEY, JSON.stringify(summary));
    window.localStorage.removeItem(LAST_NOTICE_KEY);
  } catch {
    // Ignore storage failures and keep the form usable.
  }
}

function saveNoticeState(notice: QuoteNotice) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LAST_NOTICE_KEY, JSON.stringify(notice));
  } catch {
    // Ignore storage failures and keep the form usable.
  }
}

function readLastSuccessState(): QuoteSummary | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LAST_SUCCESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QuoteSummary>;

    if (parsed?.name && parsed?.inquiryType && parsed?.primaryNeed && parsed?.secondaryNeed) {
      return {
        name: parsed.name,
        company: parsed.company || UI.common.companyFallback,
        inquiryType: parsed.inquiryType,
        primaryNeed: parsed.primaryNeed,
        secondaryNeed: parsed.secondaryNeed,
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
