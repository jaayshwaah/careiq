// src/components/Composer.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, SendHorizontal } from "lucide-react";

type Props = {
  onSend?: (text: string, files: File[]) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
};

export default function Composer({
  onSend,
  disabled = false,
  placeholder = "How can I help today?",
  autoFocus = true,
}: Props) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Thin default; grow with content
  const MIN_H = 40; // ~44px visual
  const MAX_H = 160;

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
    const next = Math.min(MAX_H, Math.max(MIN_H, el.scrollHeight));
    el.style.height = `${next}px`;
  };

  // Attachments
  const chooseFiles = () => fileInputRef.current?.click();
  const filesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
    e.target.value = "";
  };
  const clearAttachments = (idx?: number) => {
    if (typeof idx === "number") setFiles((prev) => prev.filter((_, i) => i !== idx));
    else setFiles([]);
  };

  // Send
  const actuallySend = useCallback(
    async (text: string) => {
      if (!text.trim() && files.length === 0) return;

      let ok = false;
      try {
        setIsSending(true);
        if (onSend) {
          await onSend(text.trim(), files);
          ok = true;
        } else {
          const evt = new CustomEvent("composer:send", { detail: { text: text.trim(), files } });
          window.dispatchEvent(evt);
        }
      } catch {
        ok = false;
      } finally {
        setIsSending(false);
        if (ok) {
          setValue("");
          clearAttachments();
        }
        taRef.current?.focus();
      }
    },
    [onSend, files]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSending && !disabled) void actuallySend(value);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSending && !disabled) void actuallySend(value);
    }
  };

  const isEmpty = value.trim().length === 0;

  return (
    <form onSubmit={onSubmit} className="w-full">
      {/* Attachment chips */}
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <button
              key={`${f.name}-${i}`}
              type="button"
              onClick={() => clearAttachments(i)}
              title="Click to remove"
              className="group max-w-full truncate rounded-xl border border-default/70 bg-white/70 px-3 py-1.5 text-xs text-neutral-700 shadow-sm hover:bg-white dark:bg-neutral-900/60 dark:text-neutral-200 dark:hover:bg-neutral-900"
            >
              📎 {f.name}
              <span className="ml-2 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500 group-hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:group-hover:bg-neutral-700">
                remove
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Pill */}
      <div
        className={[
          "relative flex w-full items-center gap-2 sm:gap-3 rounded-full px-3 sm:px-4",
          "border border-default shadow-[0_8px_24px_rgba(0,0,0,0.06)]",
          "bg-white dark:bg-[rgba(20,20,20,0.65)]",
          // subtle soft gradient sheen for the “liquid” vibe
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-full",
          "before:bg-[radial-gradient(120%_140%_at_10%_10%,rgba(255,255,255,0.8),rgba(255,255,255,0)_60%),linear-gradient(90deg,rgba(255,255,255,0.3),rgba(255,255,255,0))]",
        ].join(" ")}
        style={{ minHeight: MIN_H + 12 }}
      >
        {/* Left + */}
        <button
          type="button"
          onClick={chooseFiles}
          aria-label="Add attachment"
          title="Add attachment"
          disabled={disabled || isSending}
          className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full hover:bg-neutral-100 focus:outline-none dark:hover:bg-neutral-800"
        >
          <Plus className="h-[18px] w-[18px]" />
        </button>

        {/* Textarea (placeholder centered when empty) */}
        <div className="flex min-w-0 flex-1 items-center py-1">
          <textarea
            ref={taRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            spellCheck
            disabled={disabled || isSending}
            aria-label="Message"
            className={[
              "w-full resize-none bg-transparent outline-none",
              "text-[15px] leading-[22px]",
              "placeholder:text-neutral-400",
              // Center the placeholder text when empty; user text stays left-aligned
              isEmpty ? "text-left placeholder:text-center" : "text-left",
              // extra vertical padding helps optical centering
              "py-3"
            ].join(" ")}
          />
        </div>

        {/* Send — glass button with soft edge glow */}
        <button
          type="submit"
          aria-label="Send message"
          title="Send"
          disabled={disabled || isSending || (!value.trim() && files.length === 0)}
          className={[
            "relative ml-1 inline-flex h-[32px] min-w-[38px] items-center justify-center rounded-full px-3 text-sm font-medium transition ease-ios",
            "active:scale-[0.99]",
            disabled || isSending || (!value.trim() && files.length === 0)
              ? "opacity-70 cursor-not-allowed"
              : "hover:opacity-95",
            // glass
            "text-zinc-900 dark:text-white",
            "bg-white/70 dark:bg-white/10 backdrop-blur",
            "border border-white/50 dark:border-white/20",
            "shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
          ].join(" ")}
          style={{
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.6) inset, 0 0 20px rgba(99,102,241,0.25), 0 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          <SendHorizontal className="relative h-[16px] w-[16px]" />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[-2px] -z-10 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(99,102,241,0.35), rgba(6,182,212,0.25), rgba(244,63,94,0.25), rgba(34,197,94,0.25), rgba(99,102,241,0.35))",
              filter: "blur(8px)",
              opacity: 0.6,
            }}
          />
        </button>

        <input ref={fileInputRef} type="file" className="hidden" multiple onChange={filesPicked} />
      </div>
    </form>
  );
}
