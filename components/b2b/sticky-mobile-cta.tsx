"use client";

import { useState, useEffect } from "react";
import { Phone, Zap } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { trackEvent } from "@/lib/lead-tracking";

export function StickyMobileCta() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Hide when keyboard is open to avoid blocking form fields
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")
      ) {
        setIsKeyboardOpen(true);
      }
    };

    const handleFocusOut = () => {
      setIsKeyboardOpen(false);
    };

    // Also hide if visualViewport height drops significantly (Android keyboard)
    const handleViewportResize = () => {
      if (window.visualViewport) {
        const isShrunk = window.visualViewport.height < window.innerHeight * 0.75;
        setIsKeyboardOpen(isShrunk);
      }
    };

    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportResize);
    }

    return () => {
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportResize);
      }
    };
  }, []);

  const handleQuoteClick = () => {
    trackEvent("start_quote_form", { source: "sticky_mobile_cta" });

    // Scroll smoothly to quick quote form or fallback to rfq-form
    const quickQuoteEl = document.getElementById("quick-quote") || document.getElementById("rfq-form");
    if (quickQuoteEl) {
      quickQuoteEl.scrollIntoView({ behavior: "smooth", block: "center" });
      const firstInput = quickQuoteEl.querySelector("input") as HTMLInputElement | null;
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 400);
      }
    } else {
      window.location.href = "/nhan-bao-gia";
    }
  };

  const handlePhoneClick = () => {
    trackEvent("phone_click", { source: "sticky_mobile_cta" });
  };

  if (isKeyboardOpen || !isVisible) {
    return null;
  }

  return (
    <nav
      className="sticky-mobile-cta"
      aria-label="Thanh thao tác nhanh báo giá và gọi điện"
      role="navigation"
    >
      <div className="sticky-mobile-cta__inner">
        <button
          type="button"
          onClick={handleQuoteClick}
          className="sticky-mobile-cta__btn-quote"
          aria-label="Nhận báo giá thực phẩm trong 24h"
        >
          <Zap size={17} className="text-emerald-300" />
          <span>Báo giá 24h</span>
        </button>

        <a
          href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`}
          onClick={handlePhoneClick}
          className="sticky-mobile-cta__btn-phone"
          aria-label={`Gọi ngay số hotline ${siteConfig.phone}`}
        >
          <Phone size={17} />
          <span>Gọi: {siteConfig.phone}</span>
        </a>
      </div>
    </nav>
  );
}
