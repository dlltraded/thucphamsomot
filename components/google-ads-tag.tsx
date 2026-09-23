"use client";

import { useEffect } from "react";

const ADS_ID = "AW-18295927026";

export function GoogleAdsTag() {
  useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer?.push(args));
    window.gtag("js", new Date());
    window.gtag("config", ADS_ID);

    let loaded = false;
    let interactionTimer: number | undefined;
    const load = () => {
      if (loaded || document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${ADS_ID}"]`)) return;
      loaded = true;
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${ADS_ID}`;
      document.head.appendChild(script);
    };
    const onInteraction = () => {
      interactionTimer = window.setTimeout(load, 1200);
    };

    const idleTimer = window.setTimeout(load, 30000);
    window.addEventListener("pointerdown", onInteraction, { once: true, passive: true });
    window.addEventListener("keydown", onInteraction, { once: true, passive: true });
    return () => {
      window.clearTimeout(idleTimer);
      if (interactionTimer) window.clearTimeout(interactionTimer);
      window.removeEventListener("pointerdown", onInteraction);
      window.removeEventListener("keydown", onInteraction);
    };
  }, []);

  return null;
}
