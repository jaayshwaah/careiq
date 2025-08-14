"use client";

import React from "react";

type Positioning = "flow" | "sticky-edge" | "static";

type Props = {
  id?: string;
  placeholder?: string;
  maxHeightPx?: number; // limit the auto-resize
  onSend?: (text: string) => void | Promise<void>;
  /** "flow" (default) renders in normal layout; "static" can be used when you wrap this in a fixed wrapper; "sticky-edge" reserved for future sticky use */
  positioning?: Positioning;
};

const IconSend = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path d="M22 2 11 13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22 2 15 22 11 13 2 9l20-7Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Composer({
  id,
  placeholder = "Message CareIQ",
  maxHeightPx = 160,
  onSend,
  positioning = "flow",
}: Props) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = React.useState("");
  const [disabled, setDisabled] = React.useState(false);

  function autoresize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const max = maxHeightPx;
    const next = Math.min(el.scrollHeight, max);
    el.style.height = next + "px";
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    requestAnimationFrame(() => autoresize());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !(e as any).isComposing && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      void submit();
    }
  }

  async function submit() {
    const text = value.trim();
    if (!text) return;
    setDisabled(true);
    try {
      if (onSend) {
        await onSend(text);
      } else {
        window.dispatchEvent(new CustomEvent("composer:send", { detail: { text } }));
      }
    } finally {
      setValue("");
      setDisabled(false);
      requestAnimationFrame(() => autoresize());
    }
  }

  // Wrapper behavior: we keep this neutral so you can place it in sticky/absolute containers elsewhere.
  // "flow" and "sticky-edge" render the same here; "static" avoids margins if you embed it in your own fixed/sticky wrapper.

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      style={{ background: "var(--bg)" }}
    >
      {/* Panel container (liquid glass) */}
      <div className="glass ring-1 ring-black/10 dark:ring-white/10 rounded-2xl p-2 shadow-soft focus-within:ring-2 focus-within:ring-black/20 dark:focus-within:ring-white/20 transition">
        <div className="flex items-end gap-2">
          <textarea
            id={id}
            ref={ref}
            rows={1}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="max-h-40 min-h-[52px] w-full resize-y rounded-xl bg-transparent px-3 py-3 text-[15px] leading-relaxed placeholder:text-ink-subtle focus:outline-none disabled:opacity-60"
            disabled={disabled}
            aria-label="Message input"
          />
          <button
            className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ring-1 ring-black/10 dark:ring-white/10 bg-white/70 hover:bg-white/90 active:bg-white dark:bg-white/10 dark:hover:bg-white/15 shadow-soft hover:shadow-md focus:outline-none"
            onClick={() => void submit()}
            style={{
              height: "40px",
              width: "40px",
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

        {/* OS‑aware hint + subtle clock (to match ChatWindow) */}
        <div className="mt-1 flex items-center justify-between px-1">
          <ComposerHint />
          <div className="text-[11px] text-ink-subtle" aria-hidden>
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    </form>
  );
}

function ComposerHint() {
  if (typeof navigator === "undefined") return null;
  const p = (navigator as any).userAgentData?.platform || navigator.platform || "";
  const isMac = /Mac|iPhone|iPad|Macintosh/.test(p);
  return (
    <span className="text-xs text-gray-600 dark:text-white/50">
      {isMac ? (
        <>
          Press <kbd>Return</kbd> to send • <kbd>Shift</kbd>+<kbd>Return</kbd> for newline
        </>
      ) : (
        <>
          Press <kbd>Enter</kbd> to send • <kbd>Shift</kbd>+<kbd>Enter</kbd> for newline
        </>
      )}
    </span>
  );
}
