"use client";

import React from "react";

type Props = {
  id?: string;
  placeholder?: string;
  maxHeightPx?: number; // limit the auto-resize
  onSend?: (text: string) => void | Promise<void>;
  /** Stick the composer to the page bottom (after first message) */
  stickyAtBottom?: boolean;
};

const IconSend = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M5 12L20 5l-3.5 14-4.5-5-7-2z" fill="currentColor" />
  </svg>
);

export default function Composer({
  id = "composer-input",
  placeholder = "Send a message…",
  maxHeightPx = 240,
  onSend,
  stickyAtBottom = false,
}: Props) {
  const ref = React.useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = React.useState("");

  const autoresize = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, maxHeightPx);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > next ? "auto" : "hidden";
  }, [maxHeightPx]);

  React.useEffect(() => {
    autoresize();
  }, [autoresize]);

  const handleInput: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    setValue(e.target.value);
    autoresize();
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    // Submit on Enter, newline with Shift+Enter (ChatGPT-like)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const disabled = value.trim().length === 0;

  async function submit() {
    const text = value.trim();
    if (!text) return;
    try {
      if (onSend) {
        await onSend(text);
      } else {
        window.dispatchEvent(new CustomEvent("composer:send", { detail: { text } }));
      }
    } finally {
      setValue("");
      requestAnimationFrame(() => autoresize());
    }
  }

  return (
    <form
      className={stickyAtBottom ? "sticky bottom-0" : "sticky bottom-6"}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      style={{
        background: "var(--bg)",
        paddingTop: stickyAtBottom ? 8 : 0,
      }}
    >
      <div
        className="rounded-2xl border p-1.5"
        style={{ background: "var(--panel)", borderColor: "var(--border)" }}
      >
        <div className="flex items-end gap-2">
          <textarea
            id={id}
            ref={ref}
            rows={1}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="input resize-none flex-1"
            style={{
              background: "transparent",
              border: "none",
              minHeight: 40,
              maxHeight: maxHeightPx,
              paddingTop: 8,
              paddingBottom: 8,
            }}
          />

          <button
            type="submit"
            className="btn btn-primary rounded-full p-0 disabled:opacity-60"
            style={{
              width: 38,
              height: 38,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Send"
            aria-label="Send message"
            disabled={disabled}
          >
            <IconSend className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </form>
  );
}
