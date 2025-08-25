// src/hooks/useAutoFollow.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Manages "auto-follow" (auto-scroll to bottom) behavior for a scroll container.
 * - Auto-follows when near the bottom
 * - Pauses when user scrolls up
 * - Exposes helpers: scrollToBottom, resumeAutoFollow
 * - Emits isAtBottom & isAutoFollow for UI (FAB, toast, etc.)
 *
 * Integrates with a simple global event so the Composer can resume auto-follow on send:
 *   window.dispatchEvent(new CustomEvent("careiq:resume-autofollow"));
 */

export function useAutoFollow() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isAutoFollow, setIsAutoFollow] = useState(true);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);

  const SCROLL_PADDING = 16;
  const AT_BOTTOM_THRESHOLD = 24; // px

  const computeIsAtBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    const diff = el.scrollHeight - el.clientHeight - el.scrollTop;
    return diff <= AT_BOTTOM_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = containerRef.current;
    if (!el) return;
    const top = el.scrollHeight - el.clientHeight + SCROLL_PADDING;
    el.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const resumeAutoFollow = useCallback(() => {
    setIsAutoFollow(true);
    requestAnimationFrame(() => scrollToBottom(true));
  }, [scrollToBottom]);

  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const atBottom = computeIsAtBottom();
      setIsAtBottom(atBottom);
      if (!atBottom) {
        // User scrolled away → pause auto-follow until we resume
        setIsAutoFollow(false);
      }
    };
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [computeIsAtBottom]);

  // Intersection observer alternative (robust on resize/content changes)
  useEffect(() => {
    const el = containerRef.current;
    const sentinel = bottomSentinelRef.current;
    if (!el || !sentinel) return;
    const io = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((e) => e.isIntersecting);
        setIsAtBottom(isVisible);
        if (isVisible) setIsAutoFollow(true);
      },
      { root: el, threshold: 0.98 }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  // Global "resume" hook for Composer → MessageList
  useEffect(() => {
    const onResume = () => resumeAutoFollow();
    window.addEventListener("careiq:resume-autofollow", onResume);
    return () => window.removeEventListener("careiq:resume-autofollow", onResume);
  }, [resumeAutoFollow]);

  return {
    containerRef,
    bottomSentinelRef,
    isAtBottom,
    isAutoFollow,
    scrollToBottom,
    resumeAutoFollow,
  };
}
