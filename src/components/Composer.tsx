// src/components/Composer.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Paperclip, SendHorizontal, X } from "lucide-react";

type Props = {
  onSend?: (text: string, files: File[]) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
};

const MIN_H = 44;
const MAX_H = 180;

export default function Composer({
  onSend,
  disabled = false,
  placeholder = "How can I help today?",
  autoFocus = true,
}: Props) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocus) taRef.current?.focus();
    // initial height
    requestAnimationFrame(() => resize());
  }, [autoFocus]);

  const resize = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(MAX_H, Math.max(MIN_H, el.scrollHeight));
    el.style.height = `${next}px`;
  }, []);

  const chooseFiles = () => fileInputRef.current?.click();

  const filesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
    e.target.value = "";
  };

  const removeFile = (i: number) =>
    setFiles((prev) => prev.filter((_, idx) => i !== idx));

  const clearAll = () => setFiles([]);

  const trySend = async () => {
    const text = value.trim();
    if (!text && files.length === 0) return;
    try {
      setBusy(true);
      await onSend?.(text, files);
      setValue("");
      clearAll();
      resize();
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !(e as any).isComposing) {
      e.preventDefault();
      if (!disabled && !busy) void trySend();
    }
  };

  return (
    <div className="w-full">
      {/* attachment strip */}
      {files.length > 0 && (
        <div className="mx-auto mb-2 flex max-w-3xl flex-wrap gap-2">
          {files.map((f, i) => (
            <span
              key={i}
              className="group inline-flex items-center gap-2 rounded-2xl bg-white/60 px-3 py-1 text-xs text-neutral-700 backdrop-blur-md ring-1 ring-black/5 dark:bg-neutral-900/60 dark:text-neutral-200 dark:ring-white/10"
            >
              <span className="truncate">{f.name}</span>
              <button
                onClick={() => removeFile(i)}
                className="rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/10"
                aria-label={`Remove ${f.name}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative mx-auto w-full max-w-3xl">
        <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-gradient-to-b from-transparent via-white/60 to-white/40 blur-md dark:via-neutral-800/60 dark:to-neutral-900/40" />
        <div className="relative flex w-full items-end gap-2 rounded-3xl border border-black/10 bg-white/70 p-2 backdrop-blur-xl transition-[box-shadow] dark:border-white/10 dark:bg-neutral-900/60">
          {/* attach */}
          <button
            onClick={chooseFiles}
            disabled={disabled || busy}
            title="Attach files"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/60 ring-1 ring-black/5 hover:bg-white/80 active:scale-[0.98] dark:bg-neutral-800/60 dark:ring-white/10 dark:hover:bg-neutral-800/80"
          >
            <Paperclip size={18} />
          </button>

          {/* textarea */}
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              resize();
            }}
            onKeyDown={onKey}
            disabled={disabled || busy}
            placeholder={placeholder}
            className="max-h-[180px] min-h-[44px] w-full resize-none overflow-y-auto bg-transparent px-2 py-2 leading-6 placeholder:text-neutral-400 focus:outline-none"
          />

          {/* send button — “liquid glass” edge glow */}
          <button
            onClick={() => void trySend()}
            disabled={disabled || busy || (!value.trim() && files.length === 0)}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 ring-1 ring-black/5 transition active:scale-[0.98] disabled:opacity-50 dark:bg-neutral-800/70 dark:ring-white/10"
            aria-label="Send message"
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-70 blur-[6px]"
              style={{
                background:
                  "conic-gradient(from 0deg, rgba(99,102,241,0.45), rgba(34,197,94,0.35), rgba(244,63,94,0.35), rgba(234,179,8,0.35), rgba(99,102,241,0.45))",
              }}
            />
            <SendHorizontal className="relative" size={18} />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={filesPicked}
          />
        </div>
      </div>
    </div>
  );
}
