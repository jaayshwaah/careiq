// src/components/Composer.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, SendHorizontal } from "lucide-react";

type Props = {
  /** Optional: parent handler. If omitted, we dispatch a DOM CustomEvent('composer:send'). */
  onSend?: (text: string, files: File[]) => Promise<void> | void;
  /** Optional: disable input (e.g., while sending) */
  disabled?: boolean;
  /** Optional: placeholder override */
  placeholder?: string;
  /** Optional: autoFocus on mount */
  autoFocus?: boolean;
};

export default function Composer({
  onSend,
  disabled = false,
  placeholder = "Ask anything",
  autoFocus = true,
}: Props) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLFormElement | null>(null);

  // ===== Autosize config =====
  // Default thin height; expand up to a cap as the user types.
  const MIN_HEIGHT = 40;  // thin default (approx 44px total pill)
  const MAX_HEIGHT = 160; // prevent runaway

  useEffect(() => {
    if (autoFocus && taRef.current) taRef.current.focus();
    autosize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    autosize();
  }, [value]);

  const autosize = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, el.scrollHeight));
    el.style.height = `${next}px`;
  };

  // ===== Attachments (left + button) =====
  const handleChooseFiles = () => fileInputRef.current?.click();

  const handleFilesPicked = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const list = ev.target.files;
    if (!list || list.length === 0) return;
    setFiles(prev => [...prev, ...Array.from(list)]);
    ev.target.value = ""; // allow picking the same file again
  };

  const clearAttachments = (idx?: number) => {
    if (typeof idx === "number") {
      setFiles(prev => prev.filter((_, i) => i !== idx));
    } else {
      setFiles([]);
    }
  };

  // ===== Send =====
  const actuallySend = useCallback(
    async (text: string) => {
      if (!text.trim() && files.length === 0) return;
      try {
        setIsSending(true);
        if (onSend) {
          await onSend(text.trim(), files);
        } else {
          const evt = new CustomEvent("composer:send", {
            detail: { text: text.trim(), files },
          });
          window.dispatchEvent(evt);
        }
      } finally {
        setIsSending(false);
        setValue("");
        clearAttachments();
        taRef.current?.focus();
      }
    },
    [onSend, files]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending || disabled) return;
    void actuallySend(value);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSending && !disabled) void actuallySend(value);
    }
  };

  // ===== Liquid‑glass (iOS/macOS vibe) styles =====
  const glassBtnStyle: React.CSSProperties = {
    // Liquid glass: translucent, blurred, subtle inner highlight
    backdropFilter: "saturate(180%) blur(14px)",
    WebkitBackdropFilter: "saturate(180%) blur(14px)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.70), rgba(255,255,255,0.55))",
    border: "1px solid rgba(0,0,0,0.10)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.65), 0 8px 24px rgba(0,0,0,0.08)",
  };

  const glassBtnStyleDark: React.CSSProperties = {
    backdropFilter: "saturate(180%) blur(14px)",
    WebkitBackdropFilter: "saturate(180%) blur(14px)",
    background:
      "linear-gradient(180deg, rgba(30,30,30,0.70), rgba(30,30,30,0.55))",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 24px rgba(0,0,0,0.32)",
  };

  const pillStyle: React.CSSProperties = {
    // Thin default height, grows with textarea
    minHeight: MIN_HEIGHT + 12, // padding + borders ~ visually ~44px
  };

  return (
    <form
      ref={containerRef}
      onSubmit={onSubmit}
      className="w-full"
      aria-label="Chat composer"
    >
      {/* Attachment chips */}
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <button
              key={`${f.name}-${i}`}
              type="button"
              onClick={() => clearAttachments(i)}
              className="group max-w-full truncate rounded-xl border border-default/70 bg-white/70 px-3 py-1.5 text-xs text-neutral-700 hover:bg-white shadow-sm dark:bg-neutral-900/60 dark:text-neutral-200 dark:hover:bg-neutral-900"
              title="Click to remove"
            >
              📎 {f.name}
              <span className="ml-2 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500 group-hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:group-hover:bg-neutral-700">
                remove
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Pill input */}
      <div
        className={[
          "relative flex w-full items-center gap-3 rounded-full px-3 sm:px-4",
          "border border-default bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]",
          "dark:bg-[rgba(20,20,20,0.65)]",
        ].join(" ")}
        style={pillStyle}
      >
        {/* Left plus (attachments) */}
        <button
          type="button"
          onClick={handleChooseFiles}
          className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full border border-transparent hover:bg-neutral-100 focus:outline-none dark:hover:bg-neutral-800"
          aria-label="Add attachment"
          title="Add attachment"
          disabled={disabled || isSending}
        >
          <Plus className="h-[18px] w-[18px]" />
        </button>

        {/* Text area (auto-expands) */}
        <div className="flex-1 py-2">
          <textarea
            ref={taRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className={[
              "w-full resize-none bg-transparent outline-none",
              "placeholder:text-neutral-400",
              "text-[15px] leading-[20px]",
            ].join(" ")}
            spellCheck
            disabled={disabled || isSending}
            aria-label="Message"
          />
        </div>

        {/* Right: Liquid‑glass Send */}
        <button
          type="submit"
          disabled={disabled || isSending || (!value.trim() && files.length === 0)}
          className={[
            "ml-1 inline-flex h-[32px] min-w-[32px] items-center justify-center rounded-full px-3 text-sm font-medium transition ease-ios",
            "active:scale-[0.99]",
            disabled || isSending || (!value.trim() && files.length === 0)
              ? "opacity-70 cursor-not-allowed"
              : "hover:opacity-95",
            "text-black dark:text-white",
          ].join(" ")}
          style={{
            ...(typeof window !== "undefined" &&
            document.documentElement.classList.contains("dark")
              ? glassBtnStyleDark
              : glassBtnStyle),
          }}
          aria-label="Send message"
          title="Send"
        >
          <SendHorizontal className="h-[16px] w-[16px]" />
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={handleFilesPicked}
        />
      </div>

      {/* Footer helper row (subtle) */}
      <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-neutral-500 dark:text-neutral-400">
        <div className="hidden sm:block">
          Press <kbd className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">Enter</kbd> to send •
          <span className="ml-1">
            <kbd className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">Shift</kbd>+
            <kbd className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">Enter</kbd> for a new line
          </span>
        </div>
        {isSending && <div className="animate-pulse">Sending…</div>}
      </div>
    </form>
  );
}
