"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ThreeBackground = dynamic(
  () => import("./three-background").then((module) => module.ThreeBackground),
  { ssr: false, loading: () => null },
);

/** Restores the original TPS1 hero motion without delaying the first paint. */
export function DeferredThreeBackground() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setReady(true), 700);
    return () => window.clearTimeout(timer);
  }, []);

  return ready ? <ThreeBackground /> : null;
}
