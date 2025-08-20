// src/lib/useAutoScroll.ts
import { useCallback, useEffect, useRef, useState } from "react";

type NewContentKind = "assistant" | "user";

/**
 * Smart auto-scroll with "manual pause" semantics.
 *
 * Behavior:
 * - User scrolls up → auto-follow PAUSES (persists).
 * - "Jump to latest" or "resumeAutoFollow()" → auto-follow RESUMES and jumps to bottom.
 * - When paused and new ASSISTANT tokens arrive while scrolled up → sets hasUnseen=true (toast).
 * - When NOT paused (or currently at bottom), new content keeps you pinned to bottom smoothly.
 */
export function useAutoScroll<T extends HTMLElement>(bottomThresholdPx = 72) {
  const ref = useRef<T | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [paused, setPaused] = useState(false); // manual pause persists until resume
  const [hasUnseen, setHasUnseen] = useState(false);

  const computeIsAtBottom = useCallback(() => {
    const el = ref.current;
    if (!el) return true;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distance <= bottomThresholdPx;
  }, [bottomThresholdPx]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleScroll = useCallback(() => {
    // Update "at bottom" on any scroll.
    const atBottom = computeIsAtBottom();
    setIsAtBottom(atBottom);

    // If the user moved away from bottom, set/persist manual pause.
    // If they reach bottom again, keep "paused" as-is (they must click jump or send).
    if (!atBottom) setPaused(true);
  }, [computeIsAtBottom]);

  /**
   * Consumer should call this when new content is appended.
   * - If paused and not at bottom and kind is "assistant" → show unseen toast.
   * - Otherwise follow to bottom.
   */
  const notifyNewContent = useCallback(
    (kind: NewContentKind) => {
      const atBottom = computeIsAtBottom();
      setIsAtBottom(atBottom);

      if (paused && !atBottom) {
        if (kind === "assistant") {
          setHasUnseen(true);
        }
        // Stay paused, do not auto-follow.
        return;
      }

      // Not paused (or currently at bottom) → follow to bottom
      scrollToBottom(kind === "assistant" ? "smooth" : "auto");
      setHasUnseen(false);
    },
    [computeIsAtBottom, paused, scrollToBottom]
  );

  /** Resume auto-follow and jump to latest. */
  const resumeAutoFollow = useCallback((behavior: ScrollBehavior = "smooth") => {
    setPaused(false);
    setHasUnseen(false);
    scrollToBottom(behavior);
  }, [scrollToBottom]);

  /** Optionally clear the unseen toast (e.g., on overlay dismiss). */
  const clearUnseen = useCallback(() => setHasUnseen(false), []);

  // Ensure we start at bottom on first mount
  useEffect(() => {
    scrollToBottom("auto");
    setIsAtBottom(true);
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
