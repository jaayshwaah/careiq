"use client";

import React from "react";

type Positioning = "flow" | "sticky-edge" | "static";

type Props = {
  id?: string;
  placeholder?: string;
  maxHeightPx?: number; // limit the auto-resize
  onSend?: (text: string) => void | Promise<void>;
  /** "flow" (default) renders in normal layout; "static" can be used inside a fixed wrapper; "sticky-edge" reserved for future sticky use */
  positioning?: Positioning;
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
  positioning = "flow",
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
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !(e as any).isComposing &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey
    ) {
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

  // Wrapper behavior: we keep this neutral so you can place it in sticky/absolute containers elsewhere.
  // "flow" and "sticky-edge" render the same here; "static" avoids extra padding/margins if you embed it in your own fixed/sticky wrapper.
  const wrapperClass =
    positioning === "static"
      ? ""
      : ""; // reserved for future variants without breaking layout

  return (
    <form
      className={wrapperClass}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      style={{ background: "var(--bg)" }}
    >
      {/* Panel container: light-first, dark via .dark */}
      <div className="panel p-1.5">
        <div className="flex items-end gap-2">
          <textarea
            id={id}
            ref={ref}
            rows={1}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="input flex-1 resize-none"
            style={{
              background: "transparent",
              border: "none",
              minHeight: 40, // slim initial height
              maxHeight: maxHeightPx,
              paddingTop: 8,
              paddingBottom: 8,
            }}
            aria-label="Message input"
          />

          <button
            type="submit"
            className="btn-solid rounded-full p-0 disabled:opacity-60 focus:ring-2"
            style={{
              width: 40,
              height: 40,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Send"
            aria-label="Send message"
            disabled={disabled}
          >
            <IconSend className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </form>
  );
}
