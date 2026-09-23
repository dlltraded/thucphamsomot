"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Phone, MessageSquare, CheckCircle2, AlertCircle, Loader2, Sparkles, Building2, ShoppingBag } from "lucide-react";
import { siteConfig } from "@/lib/site";
import {
  extractUrlTrackingData,
  trackEvent,
  triggerGoogleAdsAndMetaConversion,
  resetConversionFlag,
} from "@/lib/lead-tracking";

interface QuickQuoteFormProps {
  variant?: "hero" | "landing" | "card";
  className?: string;
  sourceContext?: string;
}

export function QuickQuoteForm({
  variant = "hero",
  className = "",
  sourceContext = "homepage_hero",
}: QuickQuoteFormProps) {
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [need, setNeed] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [submittedData, setSubmittedData] = useState<{ company: string; phone: string; need: string } | null>(null);

  const hasStartedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track view_quote_form once
  useEffect(() => {
    trackEvent("view_quote_form", { source: sourceContext, variant });
  }, [sourceContext, variant]);

  // Track start_quote_form on first user interaction
  const handleFirstInteraction = () => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      trackEvent("start_quote_form", { source: sourceContext, variant });
    }
  };

  // Friendly Vietnamese phone validation
  const validatePhone = (rawPhone: string): boolean => {
    const cleaned = rawPhone.replace(/[\s\.\-\(\)]/g, "");
    const normalized = cleaned.startsWith("+84") ? "0" + cleaned.slice(3) : cleaned;
    return /^(0[235789])[0-9]{8}$/.test(normalized);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");

    const trimmedCompany = company.trim();
    const trimmedPhone = phone.trim();
    const trimmedNeed = need.trim();

    if (!trimmedCompany) {
      setErrorMessage("Vui lòng nhập tên công ty hoặc bếp ăn của bạn");
      return;
    }

    if (!trimmedPhone) {
      setErrorMessage("Vui lòng nhập số điện thoại liên hệ");
      return;
    }

    if (!validatePhone(trimmedPhone)) {
      setErrorMessage("Số điện thoại chưa đúng định dạng (VD: 0912 345 678)");
      return;
    }

    if (!trimmedNeed) {
      setErrorMessage("Vui lòng cho biết nhóm hàng cần mua hoặc số suất ăn");
      return;
    }

    setStatus("submitting");

    const tracking = extractUrlTrackingData();

    // Map to quoteSchema
    // ensure message has >= 10 chars as per Zod schema rule
    const formattedMessage = trimmedNeed.length >= 10 ? trimmedNeed : `Nhu cầu B2B: ${trimmedNeed} (báo giá)`;

    const payload = {
      inquiryType: "buyer",
      name: trimmedCompany,
      phone: trimmedPhone,
      company: trimmedCompany,
      message: formattedMessage,
      interestedIn: trimmedNeed,
      facilityType: "Bếp ăn / Doanh nghiệp",
      hasBuyingList: "Chưa",
      utmSource: tracking.utmSource,
      utmMedium: tracking.utmMedium,
      utmCampaign: tracking.utmCampaign,
      utmContent: tracking.utmContent,
      utmTerm: tracking.utmTerm,
      gclid: tracking.gclid,
      fbclid: tracking.fbclid,
      pagePath: tracking.pagePath,
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
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Không thể gửi yêu cầu lúc này");
      }

      setStatus("success");
      setSubmittedData({ company: trimmedCompany, phone: trimmedPhone, need: trimmedNeed });

      // Track conversions
      trackEvent("quote_submit_success", { source: sourceContext, variant });
      triggerGoogleAdsAndMetaConversion({
        formName: `quick_quote_${sourceContext}`,
        facilityType: "b2b_kitchen",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra. Vui lòng gọi hotline.";
      setStatus("error");
      setErrorMessage(msg);
      trackEvent("quote_submit_error", { source: sourceContext, error: msg });
    }
  };

  const handlePhoneClick = () => {
    trackEvent("phone_click", { source: `${sourceContext}_success_screen` });
  };

  const handleZaloClick = () => {
    trackEvent("zalo_click", { source: `${sourceContext}_success_screen` });
  };

  const handleReset = () => {
    setStatus("idle");
    setCompany("");
    setPhone("");
    setNeed("");
    setErrorMessage("");
    hasStartedRef.current = false;
    resetConversionFlag();
  };

  const isHero = variant === "hero";

  if (status === "success" && submittedData) {
    return (
      <div
        ref={containerRef}
        id="quick-quote"
        className={`quick-quote-card quick-quote-card--success ${isHero ? "quick-quote-card--hero" : ""} ${className}`}
        role="region"
        aria-label="Xác nhận yêu cầu báo giá"
      >
        <div className="quick-quote-success-badge">
          <Sparkles size={14} /> TIẾP NHẬN THÀNH CÔNG
        </div>

        <div className="quick-quote-success-icon-wrap">
          <CheckCircle2 size={44} className="text-emerald-400" />
        </div>

        <h3 className="quick-quote-title text-center">Đã nhận yêu cầu báo giá!</h3>

        <p className="quick-quote-desc text-center">
          Cảm ơn đại diện <strong>{submittedData.company}</strong>. Bộ phận kinh doanh TPS1 sẽ liên hệ tới số{" "}
          <strong className="text-emerald-400">{submittedData.phone}</strong> trong vòng <strong>30 phút</strong> để xác
          nhận và gửi bảng giá chi tiết trong <strong>24 giờ</strong>.
        </p>

        <div className="quick-quote-success-actions">
          <a
            href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`}
            onClick={handlePhoneClick}
            className="btn-quick-call"
            aria-label="Gọi hotline hỗ trợ ngay"
          >
            <Phone size={16} /> Gọi ngay: {siteConfig.phone}
          </a>
          <a
            href={`https://zalo.me/${siteConfig.zalo}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleZaloClick}
            className="btn-quick-zalo"
            aria-label="Nhắn tin qua Zalo nhận bảng giá"
          >
            <MessageSquare size={16} /> Chat Zalo nhận giá
          </a>
        </div>

        <div className="quick-quote-extra-note">
          <p>
            Bạn có sẵn file dự toán hoặc danh sách chi tiết?{" "}
            <a href="#rfq-form" className="text-emerald-400 underline font-medium">
              Gửi thêm file tại đây
            </a>
          </p>
          <button type="button" onClick={handleReset} className="quick-quote-reset-link">
            Gửi yêu cầu báo giá khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id="quick-quote"
      className={`quick-quote-card ${isHero ? "quick-quote-card--hero" : ""} ${className}`}
      role="region"
      aria-labelledby="quick-quote-title"
    >
      <div className="quick-quote-header">
        <div className="quick-quote-badge">
          <span className="quick-quote-pulse-dot" /> Phản hồi trong 24 giờ
        </div>
        <h3 id="quick-quote-title" className="quick-quote-title">
          Nhận báo giá thực phẩm trong 24h
        </h3>
        <p className="quick-quote-desc">
          Báo giá sỉ theo sản lượng cho bếp ăn, nhà máy, trường học, bệnh viện. Hóa đơn VAT & kiểm nghiệm đầy đủ.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="quick-quote-form" noValidate>
        {/* Field 1: Company / Kitchen Name */}
        <div className="quick-quote-field">
          <label htmlFor="qq-company" className="quick-quote-label">
            <Building2 size={14} /> Tên công ty / bếp ăn <span className="text-emerald-400">*</span>
          </label>
          <input
            id="qq-company"
            type="text"
            required
            autoComplete="organization"
            placeholder="VD: Cty May Đồng Nai, Bếp ăn Tân Cảng..."
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            onFocus={handleFirstInteraction}
            className="quick-quote-input"
            aria-required="true"
          />
        </div>

        {/* Field 2: Phone */}
        <div className="quick-quote-field">
          <label htmlFor="qq-phone" className="quick-quote-label">
            <Phone size={14} /> Số điện thoại nhận báo giá <span className="text-emerald-400">*</span>
          </label>
          <input
            id="qq-phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="VD: 0912 345 678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onFocus={handleFirstInteraction}
            className="quick-quote-input"
            aria-required="true"
          />
        </div>

        {/* Field 3: Product group / Need */}
        <div className="quick-quote-field">
          <label htmlFor="qq-need" className="quick-quote-label">
            <ShoppingBag size={14} /> Nhóm hàng cần mua hoặc số suất <span className="text-emerald-400">*</span>
          </label>
          <input
            id="qq-need"
            type="text"
            required
            placeholder="VD: Rau củ, thịt heo tươi cho 300 suất/ngày..."
            value={need}
            onChange={(e) => setNeed(e.target.value)}
            onFocus={handleFirstInteraction}
            className="quick-quote-input"
            aria-required="true"
          />
        </div>

        {errorMessage && (
          <div className="quick-quote-error" role="alert">
            <AlertCircle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="btn-quick-submit"
          aria-label="Nhận báo giá trong 24h"
        >
          {status === "submitting" ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Đang gửi yêu cầu...
            </>
          ) : (
            <>
              <Send size={16} /> Nhận báo giá trong 24h
            </>
          )}
        </button>

        <div className="quick-quote-footer">
          <span>🔒 Thông tin được bảo mật · Không làm phiền</span>
          <span>⚡ Cần gấp? Gọi <a href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`} className="underline font-bold text-white">{siteConfig.phone}</a></span>
        </div>
      </form>
    </div>
  );
}
