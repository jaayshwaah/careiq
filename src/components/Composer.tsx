// src/components/Composer.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, Loader2, Sparkles, X, CornerDownLeft } from "lucide-react";

type ComposerProps = {
  onSend: (text: string, files?: File[]) => void | Promise<void>;
  placeholder?: string;
  isGenerating?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  initialValue?: string;
  showAttach?: boolean;
  maxLength?: number;
  /** Optional: if you want to wire scrolling yourself in parent, this fires post-send */
  onSent?: () => void;
};

export default function Composer({
  onSend,
  placeholder = "How can I help today?",
  isGenerating = false,
  disabled = false,
  autoFocus = true,
  initialValue = "",
  showAttach = true,
  maxLength,
  onSent,
}: ComposerProps) {
  const [value, setValue] = useState(initialValue);
  const [files, setFiles] = useState<File[]>([]);
  const [focused, setFocused] = useState(false);

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const trulyDisabled = disabled || isGenerating;

  const fit = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    const next = Math.min(ta.scrollHeight, Math.round(window.innerHeight * 0.4));
    ta.style.height = `${next}px`;
  }, []);

  useEffect(() => {
    fit();
  }, [value, fit]);

  useEffect(() => {
    if (autoFocus && taRef.current) taRef.current.focus();
  }, [autoFocus]);

  // Drag & drop
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onDrop = (e: DragEvent) => {
      prevent(e);
      const dt = e.dataTransfer;
      if (!dt) return;
      const picked: File[] = [];
      for (let i = 0; i < dt.files.length; i++) picked.push(dt.files[i]);
      if (picked.length) setFiles((prev) => [...prev, ...picked]);
    };

    ["dragenter", "dragover", "dragleave", "drop"].forEach((ev) =>
      el.addEventListener(ev, prevent as any),
    );
    el.addEventListener("drop", onDrop as any);

    return () => {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((ev) =>
        el.removeEventListener(ev, prevent as any),
      );
      el.removeEventListener("drop", onDrop as any);
    };
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || trulyDisabled) return;
    try {
      await onSend(trimmed, files);
      setValue("");
      setFiles([]);
      requestAnimationFrame(fit);

      // === NEW: resume auto-follow on send ===
      window.dispatchEvent(new CustomEvent("careiq:resume-autofollow"));
      onSent?.();
    } catch (e) {
      console.error(e);
    }
  }, [value, files, onSend, trulyDisabled, fit, onSent]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const removeFile = (idx: number) => setFiles((p) => p.filter((_, i) => i !== idx));
  const onPickFiles = () => fileInputRef.current?.click();
  const onFilesChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || !list.length) return;
    const picked: File[] = [];
    for (let i = 0; i < list.length; i++) picked.push(list[i]);
    setFiles((prev) => [...prev, ...picked]);
    e.currentTarget.value = "";
  };

  const remaining =
    typeof maxLength === "number" ? Math.max(0, maxLength - value.length) : undefined;

  return (
    <div className="pointer-events-auto" ref={wrapperRef}>
      {/* Attachments preview row */}
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 px-2 sm:px-0">
          {files.map((f, i) => (
            <span
              key={i}
              className="group inline-flex max-w-full items-center gap-2 truncate rounded-2xl border border-black/10 bg-white/60 px-3 py-1.5 text-sm text-black/80 shadow-sm backdrop-blur-md transition dark:border-white/10 dark:bg-zinc-900/40 dark:text-white/80"
              title={f.name}
            >
              <Sparkles className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                className="ml-0.5 rounded-full p-0.5 text-black/60 transition hover:bg-black/5 hover:text-black/80 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white/80"
                aria-label={`Remove ${f.name}`}
                onClick={() => removeFile(i)}
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Glass composer */}
      <div
        className={[
          "relative isolate w-full rounded-3xl p-[1px] transition-all duration-300",
          focused
            ? "shadow-[0_0_0_2px_rgba(255,255,255,0.6)] dark:shadow-[0_0_0_2px_rgba(255,255,255,0.12)]"
            : "shadow-[0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)]",
        ].join(" ")}
      >
        <div
          className={[
            "pointer-events-none absolute -inset-[2px] rounded-[inherit] opacity-0 blur-md transition-opacity duration-500",
            focused ? "opacity-100" : "",
          ].join(" ")}
          style={{
            background:
              "conic-gradient(from 180deg at 50% 50%, rgba(66,133,244,0.45), rgba(52,168,83,0.45), rgba(251,188,5,0.45), rgba(234,67,53,0.45), rgba(66,133,244,0.45))",
          }}
        />
        <div className="relative z-10 flex w-full items-end gap-2 rounded-[inherit] border border-black/5 bg-white/60 px-2 py-1.5 shadow-lg backdrop-blur-xl transition dark:border-white/5 dark:bg-zinc-900/40 sm:px-3 sm:py-2">
          {/* Attach */}
          {showAttach && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={onFilesChosen}
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
              />
              <button
                type="button"
                onClick={onPickFiles}
                disabled={trulyDisabled}
                className="hidden sm:inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-transparent bg-white/70 text-black/70 shadow-sm backdrop-blur hover:bg-white/90 hover:text-black transition dark:bg-zinc-950/30 dark:text-white/70 dark:hover:bg-zinc-950/50"
                aria-label="Add attachments"
              >
                <Paperclip className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Textarea */}
          <div className="flex min-w-0 flex-1 items-center">
            <Textarea
              ref={taRef}
              value={value}
              disabled={trulyDisabled}
              onChange={(e) => {
                const next =
                  typeof maxLength === "number" ? e.target.value.slice(0, maxLength) : e.target.value;
                setValue(next);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={placeholder}
              ariaLabel="Message CareIQ"
              maxLength={maxLength}
            />
          </div>

          {/* Send */}
          <button
            type="button"
            onClick={handleSend}
            disabled={trulyDisabled || value.trim().length === 0}
            className="group relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition focus:outline-none disabled:opacity-50"
            aria-label="Send message"
          >
            <span className="absolute inset-0 rounded-2xl border border-black/10 bg-white/80 shadow-md backdrop-blur-xl transition group-hover:translate-y-[-1px] dark:border-white/10 dark:bg-zinc-900/50" />
            <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
              <span className="absolute -inset-x-6 -top-8 h-12 rounded-full bg-white/40 blur-md dark:bg-white/10" />
            </span>
            <span
              className="pointer-events-none absolute -inset-[1px] rounded-2xl opacity-0 blur transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(120px 120px at 50% 50%, rgba(99,102,241,0.6), transparent 60%)",
              }}
            />
            {isGenerating ? (
              <Loader2 className="relative z-10 h-5 w-5 animate-spin text-black/80 dark:text-white/80" />
            ) : (
              <CornerDownLeft className="relative z-10 h-5 w-5 text-black/80 transition group-active:scale-95 dark:text-white/80" />
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-1 flex items-center justify-between px-1 text-xs text-black/50 dark:text-white/40">
        <span className="truncate">
          {files.length > 0 ? `${files.length} attachment${files.length > 1 ? "s" : ""} ready` : "\u00A0"}
        </span>
        {typeof remaining === "number" ? <span>{remaining} characters left</span> : <span>&nbsp;</span>}
      </div>

      <style jsx>{`
        :global(textarea.composer-ta)::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        :global(textarea.composer-ta)::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.15);
          border-radius: 8px;
        }
        :global(.dark textarea.composer-ta)::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.18);
        }
      `}</style>
    </div>
  );
}

type TAProps = {
  value: string;
  disabled: boolean;
  onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
  onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement>;
  onFocus: () => void;
  onBlur: () => void;
  placeholder: string;
  ariaLabel?: string;
  maxLength?: number;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TAProps>(function FancyTA(
  { value, disabled, onChange, onKeyDown, onFocus, onBlur, placeholder, ariaLabel, maxLength },
  ref
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!ref) return;
    if (typeof ref === "function") ref(innerRef.current);
    else (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = innerRef.current;
  }, [ref]);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, Math.round(window.innerHeight * 0.4));
    el.style.height = `${next}px`;
  }, [value]);

  return (
    <textarea
      ref={innerRef}
      className="composer-ta block w-full resize-none border-0 bg-transparent px-2 py-2 text-[15px] leading-6 text-black placeholder:text-black/40 focus:outline-none dark:text-white dark:placeholder:text-white/40 max-h-[40vh] min-h-[36px] overflow-y-auto"
      rows={1}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={ariaLabel || "Message input"}
      spellCheck
      maxLength={maxLength}
    />
  );
});
