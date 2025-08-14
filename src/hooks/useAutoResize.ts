"use client";

import { useEffect, useRef } from "react";

/**
 * Auto-resize a textarea as the user types.
 * - Sets height to 'auto' then grows to scrollHeight
 * - Caps to maxPx (with overflowY:auto when exceeded)
 * - Optionally sets a minimum height
 *
 * NOTE: This hook is SSR-safe. It never touches `window` during render;
 * all DOM access happens inside effects on the client.
 */
export function useAutoResize<T extends HTMLTextAreaElement>(
  options?: {
    /**
     * Maximum height in pixels. If omitted, defaults to 50% of viewport height on the client.
     */
    maxPx?: number;
    /**
     * Minimum height in pixels. If omitted, uses ~1.2x the computed line-height.
     */
    minPx?: number;
    onResize?: (h: number) => void;
  }
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Compute max and min AFTER mount (no SSR window access)
    const maxPx =
      typeof options?.maxPx === "number"
        ? options.maxPx
        : Math.floor((typeof window !== "undefined" ? window.innerHeight : 800) * 0.5);

    const style = typeof window !== "undefined" ? window.getComputedStyle(el) : ({} as CSSStyleDeclaration);
    const lineHeight = parseFloat(style?.lineHeight || "20") || 20;
    const minPx = typeof options?.minPx === "number" ? options.minPx : Math.ceil(lineHeight * 1.2);

    const resize = () => {
      // Reset height to measure true scrollHeight
      el.style.height = "auto";
      const next = Math.min(el.scrollHeight, maxPx);
      const target = Math.max(next, minPx);
      el.style.height = `${target}px`;
      el.style.overflowY = el.scrollHeight > maxPx ? "auto" : "hidden";
      options?.onResize?.(target);
    };

    // Initial pass + on input
    resize();
    el.addEventListener("input", resize);

    // Resize again on window size changes (maxPx depends on viewport)
    const onWin = () => resize();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", onWin);
    }

    return () => {
      el.removeEventListener("input", resize);
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", onWin);
      }
    };
    // We intentionally avoid depending on options values so we don't rewire listeners unnecessarily
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}
