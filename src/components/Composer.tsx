"use client";

import React from "react";

type Props = {
  id?: string;
  placeholder?: string;
  maxHeightPx?: number; // limit the auto-resize
};

export default function Composer({
  id = "composer-input",
  placeholder = "Send a message…",
  maxHeightPx = 240,
}: Props) {
  const ref = React.useRef<HTMLTextAreaElement | null>(null);

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

  const handleInput = () => autoresize();

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    // Submit on Enter, newline with Shift+Enter (ChatGPT-like)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  async function submit() {
    const el = ref.current;
    if (!el) return;
    const text = el.value.trim();
    if (!text) return;

    try {
      // Default behavior for now; replace with your API call if desired.
      console.log("send:", text);

      // Emit a DOM event in case you want to listen elsewhere (optional)
      window.dispatchEvent(new CustomEvent("composer:send", { detail: { text } }));
    } finally {
      el.value = "";
      autoresize();
    }
  }

  return (
    <form
      className="sticky bottom-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div
        className="rounded-2xl border p-2"
        style={{ background: "var(--panel)", borderColor: "var(--border)" }}
      >
        <textarea
          id={id}
          ref={ref}
          rows={1}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="input resize-none"
          style={{
            background: "transparent",
            border: "none",
            minHeight: 40, /* slim initial height */
            maxHeight: maxHeightPx,
            paddingTop: 8,
            paddingBottom: 8,
          }}
        />
        <div className="mt-2 flex justify-end">
          <button className="btn btn-primary" type="submit">Send</button>
        </div>
      </div>
    </form>
  );
}
