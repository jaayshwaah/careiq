// src/components/Composer.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, Paperclip, SendHorizontal } from "lucide-react";

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

  // Autofocus and autosize
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
    const next = Math.min(160, Math.max(48, el.scrollHeight));
    el.style.height = `${next}px`;
  };

  const handleChooseFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFilesPicked = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const list = ev.target.files;
    if (!list || list.length === 0) return;
    setFiles(prev => [...prev, ...Array.from(list)]);
    // Clear value so picking same file again works
    ev.target.value = "";
  };

  const clearAttachments = (idx?: number) => {
    if (typeof idx === "number") {
      setFiles(prev => prev.filter((_, i) => i !== idx));
    } else {
      setFiles([]);
    }
  };

  const actuallySend = useCallback(
    async (text: string) => {
      if (!text.trim() && files.length === 0) return;
      try {
        setIsSending(true);

        // Prefer parent callback if provided
        if (onSend) {
          await onSend(text.trim(), files);
        } else {
          // Fallback: fire a DOM event so parent can listen without prop drilling
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

  return (
    <form
      ref={containerRef}
      onSubmit={onSubmit}
      className="w-full"
      aria-label="Chat composer"
    >
      {/* Attachments (chips) */}
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <button
              key={`${f.name}-${i}`}
              type="button"
              onClick={() => clearAttachments(i)}
              className="group max-w-full truncate rounded-xl border border-default/70 bg-white/70 px-3 py-1.5 text-xs text-neutral-700 hover:bg-white shadow-sm"
              title="Click to remove"
            >
              📎 {f.name}
              <span className="ml-2 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500 group-hover:bg-neutral-200">
                remove
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Pill input */}
      <div
        className={[
          "glass relative flex w-full items-center gap-3 rounded-[28px] px-4",
          "shadow-[0_8px_24px_rgba(0,0,0,0.06)]",
          "border border-default",
          "bg-white",
        ].join(" ")}
        style={{ minHeight: 56 }}
      >
        {/* Left plus */}
        <button
          type="button"
          onClick={handleChooseFiles}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-transparent hover:bg-neutral-100 focus:outline-none"
          aria-label="Add attachment"
          title="Add attachment"
          disabled={disabled || isSending}
        >
          <Plus className="h-5 w-5" />
        </button>

        {/* Text area */}
        <div className="flex-1 py-3">
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
              "text-[15px] leading-6",
            ].join(" ")}
            spellCheck
            disabled={disabled || isSending}
            aria-label="Message"
          />
        </div>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-1 py-2">
          <button
            type="button"
            onClick={handleChooseFiles}
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100"
            aria-label="Attach files"
            title="Attach files"
            disabled={disabled || isSending}
          >
            <Paperclip className="h-4.5 w-4.5" />
          </button>

          <button
            type="submit"
            disabled={disabled || isSending || (!value.trim() && files.length === 0)}
            className={[
              "ml-1 inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium",
              "transition ease-ios",
              disabled || isSending || (!value.trim() && files.length === 0)
                ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                : "bg-black text-white hover:opacity-90 active:opacity-80",
            ].join(" ")}
            aria-label="Send message"
            title="Send"
          >
            <SendHorizontal className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={handleFilesPicked}
        />
      </div>

      {/* Footer helper row (small, subtle) — Feel free to remove if not needed */}
      <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-neutral-500">
        <div className="hidden sm:block">
          Press <kbd className="rounded bg-neutral-100 px-1">Enter</kbd> to send •
          <span className="ml-1">
            <kbd className="rounded bg-neutral-100 px-1">Shift</kbd>+<kbd className="rounded bg-neutral-100 px-1">Enter</kbd> for a new line
          </span>
        </div>
        {isSending && <div className="animate-pulse">Sending…</div>}
      </div>
    </form>
  );
}
