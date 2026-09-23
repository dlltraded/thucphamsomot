import { trackMetaLead } from "@/components/meta-pixel";

export interface UrlTrackingData {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  gclid: string;
  fbclid: string;
  pagePath: string;
}

export function extractUrlTrackingData(): UrlTrackingData {
  if (typeof window === "undefined") {
    return {
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
      utmContent: "",
      utmTerm: "",
      gclid: "",
      fbclid: "",
      pagePath: "",
    };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source") || "",
    utmMedium: params.get("utm_medium") || "",
    utmCampaign: params.get("utm_campaign") || "",
    utmContent: params.get("utm_content") || "",
    utmTerm: params.get("utm_term") || "",
    gclid: params.get("gclid") || "",
    fbclid: params.get("fbclid") || "",
    pagePath: `${window.location.pathname}${window.location.search}`,
  };
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  // Google Analytics / Google Ads gtag
  if (typeof (window as unknown as { gtag?: Function }).gtag === "function") {
    try {
      (window as unknown as { gtag: Function }).gtag("event", eventName, params || {});
    } catch {
      // Graceful fallback without breaking execution
    }
  }

  // Optional custom DOM event for analytics listeners
  try {
    window.dispatchEvent(new CustomEvent(`tps1_${eventName}`, { detail: params }));
  } catch {
    // Ignore event dispatch errors
  }
}

let hasTriggeredConversion = false;

export function triggerGoogleAdsAndMetaConversion(options?: {
  formName?: string;
  facilityType?: string;
}) {
  if (typeof window === "undefined" || hasTriggeredConversion) return;
  hasTriggeredConversion = true;

  // Google Ads conversion event
  if (typeof (window as unknown as { gtag?: Function }).gtag === "function") {
    try {
      (window as unknown as { gtag: Function }).gtag("event", "conversion", {
        send_to: "AW-18295927026/QigLCM2X-8kcEPLhlpRE",
        value: 1,
        currency: "VND",
      });
    } catch {
      // Non-blocking
    }
  }

  // Meta Pixel Lead event
  try {
    trackMetaLead({
      form_name: options?.formName || "quick_quote",
      facility_type: options?.facilityType || "b2b_kitchen",
    });
  } catch {
    // Non-blocking
  }
}

export function resetConversionFlag() {
  hasTriggeredConversion = false;
}
