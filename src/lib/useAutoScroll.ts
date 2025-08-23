// src/lib/useAutoScroll.ts
import { useCallback, useEffect, useRef, useState } from "react";

type NewContentKind = "assistant" | "user";

/**
 * Smart auto-scroll with "manual pause" semantics.
 * - User scrolls up → auto-follow PAUSES.
 * - "Jump to latest" → auto-follow RESUMES and jumps.
 * - When paused and new ASSISTANT tokens arrive → hasUnseen=true (toast).
 */
export function useAutoScroll<T extends HTMLElement>(bottomThresholdPx = 72) {
  const ref = useRef<T | null>(null);
  const pausedRef = useRef(false);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [paused, setPaused] = useState(false);
  const [hasUnseen, setHasUnseen] = useState(false);

  const computeIsAtBottom = useCallback(() => {
    const el = ref.current;
    if (!el) return true;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= bottomThresholdPx;
    return atBottom;
  }, [bottomThresholdPx]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleScroll = useCallback(() => {
    const atBottom = computeIsAtBottom();
    setIsAtBottom(atBottom);

    // If user moved away from bottom → persist manual pause.
    if (!atBottom) {
      setPaused(true);
      pausedRef.current = true;
    }
  }, [computeIsAtBottom]);

  const notifyNewContent = useCallback(
    (kind: NewContentKind) => {
      const atBottom = computeIsAtBottom();
      if (!pausedRef.current || atBottom) {
        // follow
        scrollToBottom(kind === "assistant" ? "smooth" : "auto");
        setHasUnseen(false);
        return;
      }
      // paused and scrolled up
      if (kind === "assistant") setHasUnseen(true);
    },
    [computeIsAtBottom, scrollToBottom]
  );

  const resumeAutoFollow = useCallback((behavior: ScrollBehavior = "smooth") => {
    setPaused(false);
    pausedRef.current = false;
    setHasUnseen(false);
    scrollToBottom(behavior);
  }, [scrollToBottom]);

  const clearUnseen = useCallback(() => setHasUnseen(false), []);

  useEffect(() => {
    // initialize at bottom
    setTimeout(() => {
      scrollToBottom("auto");
      setIsAtBottom(true);
    }, 0);
  }, [scrollToBottom]);

  return {
    ref,
    isAtBottom,
    paused,
    hasUnseen,
    handleScroll,
    notifyNewContent,
    resumeAutoFollow,
    clearUnseen,
  };
}
