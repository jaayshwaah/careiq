// src/components/Composer.tsx
"use client";

import React from "react";

export default function Composer({
  id = "composer-input",
  value,
  onChange,
  onSend,
  placeholder = "Message CareIQ",
  positioning = "footer",
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  onSend: (text: string) => void;
  placeholder?: string;
  positioning?: "footer" | "flow";
}) {
  const [busy, setBusy] = React.useState(false);
  const ref = React.useRef<HTMLTextAreaElement | null>(null);

  const send = async () => {
    const text = value.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await onSend(text);
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !(e as any).isComposing) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <form
      className={[
        "glass ring-1 ring-black/10 dark:ring-white/10 rounded-2xl p-3",
        positioning === "flow" ? "" : "",
      ].join(" ")}
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <textarea
        id={id}
        ref={ref}
        className="max-h-40 min-h-[72px] w-full resize-none bg-transparent outline-none"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        aria-label="Message input"
      />
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="rounded-full px-4 py-2 text-sm bg-black text-white disabled:opacity-60 dark:bg-white dark:text-black"
          disabled={busy || !value.trim()}
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </form>
  );
}
