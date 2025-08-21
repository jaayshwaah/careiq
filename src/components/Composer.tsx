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

  // Liquid glass button (light/dark)
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const update = () => setDark(!!mq?.matches);
    update();
    mq?.addEventListener?.("change", update);
    return () => mq?.removeEventListener?.("change", update);
  }, []);

  const glassBtn = dark
    ? {
        backdropFilter: "saturate(180%) blur(14px)",
        WebkitBackdropFilter: "saturate(180%) blur(14px)",
        background: "linear-gradient(180deg, rgba(30,30,30,0.70), rgba(30,30,30,0.55))",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 24px rgba(0,0,0,0.32)",
      }
    : {
        backdropFilter: "saturate(180%) blur(14px)",
        WebkitBackdropFilter: "saturate(180%) blur(14px)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.70), rgba(255,255,255,0.55))",
        border: "1px solid rgba(0,0,0,0.10)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65), 0 8px 24px rgba(0,0,0,0.08)",
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
              // add a little extra vertical padding for visual centering
              "py-3"
            ].join(" ")}
          />
        </div>

        {/* Send (liquid glass) */}
        <button
          type="submit"
          aria-label="Send message"
          title="Send"
          disabled={disabled || isSending || (!value.trim() && files.length === 0)}
          className={[
            "ml-1 inline-flex h-[32px] min-w-[32px] items-center justify-center rounded-full px-3 text-sm font-medium transition ease-ios",
            "active:scale-[0.99]",
            disabled || isSending || (!value.trim() && files.length === 0)
              ? "opacity-70 cursor-not-allowed"
              : "hover:opacity-95",
            "text-black dark:text-white",
          ].join(" ")}
          style={glassBtn}
        >
          <SendHorizontal className="h-[16px] w-[16px]" />
        </button>

        <input ref={fileInputRef} type="file" className="hidden" multiple onChange={filesPicked} />
      </div>
    </form>
  );
}
