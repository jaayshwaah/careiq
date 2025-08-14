"use client";

import { useEffect, useRef } from "react";

/**
 * Auto-resize a textarea as the user types.
 * - Sets height to 'auto' then grows to scrollHeight
 * - Caps to maxPx (with overflowY:auto when exceeded)
 * - Optionally sets a minimum height
 */
export function useAutoResize<T extends HTMLTextAreaElement>(
  options?: {
    maxPx?: number;      // default 0.5 * viewport height
    minPx?: number;      // default based on the computed line-height
    onResize?: (h: number) => void;
  }
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const maxPx = options?.maxPx ?? Math.floor(window.innerHeight * 0.5);
    const style = window.getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight || "20") || 20;
    const minPx = options?.minPx ?? Math.ceil(lineHeight * 1.2);

    const resize = () => {
      // Reset height to measure true scrollHeight
      el.style.height = "auto";
      const next = Math.min(el.scrollHeight, maxPx);
      el.style.height = `${Math.max(next, minPx)}px`;
      el.style.overflowY = el.scrollHeight > maxPx ? "auto" : "hidden";
      options?.onResize?.(next);
    };

    // Initial pass + on input
    resize();
    el.addEventListener("input", resize);

    // Resize again on window size changes (maxPx depends on viewport)
    const onWin = () => resize();
    window.addEventListener("resize", onWin);

    return () => {
      el.removeEventListener("input", resize);
      window.removeEventListener("resize", onWin);
    };
  }, [options?.maxPx, options?.minPx, options?.onResize]);

  return ref;
}
