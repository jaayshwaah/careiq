/* 
   FILE: src/components/Composer.tsx
   Fixed version - replace entire file
*/

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { 
  Send, 
  Paperclip, 
  X, 
  Loader2, 
  Mic, 
  MicOff,
  Sparkles,
  Plus,
  Command
} from "lucide-react";

type ComposerProps = {
  onSend: (text: string, files?: File[]) => void | Promise<void>;
  placeholder?: string;
  isGenerating?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  initialValue?: string;
  showAttach?: boolean;
  showVoice?: boolean;
  maxLength?: number;
  onSent?: () => void;
  className?: string;
};

export default function EnhancedComposer({
  onSend,
  placeholder = "Message CareIQ...",
  isGenerating = false,
  disabled = false,
  autoFocus = true,
  initialValue = "",
  showAttach = true,
  showVoice = false,
  maxLength,
  onSent,
  className = "",
}: ComposerProps) {
  const [value, setValue] = useState(initialValue);
  const [files, setFiles] = useState<File[]>([]);
  const [focused, setFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);

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

  // Enhanced drag & drop with visual feedback
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    
    let dragCounter = 0;
    
    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    
    const onDragEnter = (e: DragEvent) => {
      prevent(e);
      dragCounter++;
      el.classList.add('drag-over');
    };
    
    const onDragLeave = (e: DragEvent) => {
      prevent(e);
      dragCounter--;
      if (dragCounter === 0) {
        el.classList.remove('drag-over');
      }
    };
    
    const onDrop = (e: DragEvent) => {
      prevent(e);
      dragCounter = 0;
      el.classList.remove('drag-over');
      
      const dt = e.dataTransfer;
      if (!dt) return;
      const picked: File[] = [];
      for (let i = 0; i < dt.files.length; i++) picked.push(dt.files[i]);
      if (picked.length) setFiles((prev) => [...prev, ...picked]);
    };

    ["dragenter", "dragover", "dragleave", "drop"].forEach((ev) =>
      el.addEventListener(ev, prevent as any),
    );
    el.addEventListener("dragenter", onDragEnter as any);
    el.addEventListener("dragleave", onDragLeave as any);
    el.addEventListener("drop", onDrop as any);

    return () => {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((ev) =>
        el.removeEventListener(ev, prevent as any),
      );
      el.removeEventListener("dragenter", onDragEnter as any);
      el.removeEventListener("dragleave", onDragLeave as any);
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

      // Resume auto-follow on send
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

  // Voice input simulation (you'd implement actual speech recognition)
  const toggleVoice = () => {
    setIsListening(!isListening);
    // TODO: Implement actual speech recognition
    if (!isListening) {
      setTimeout(() => setIsListening(false), 3000); // Demo timeout
    }
  };

  const remaining =
    typeof maxLength === "number" ? Math.max(0, maxLength - value.length) : undefined;

  const canSend = value.trim().length > 0 && !trulyDisabled;

  return (
    <div 
      className={`pointer-events-auto ${className}`} 
      ref={wrapperRef}
      style={{
        transition: 'all 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      }}
    >
      <style jsx>{`
        .drag-over {
          transform: scale(1.02);
          box-shadow: 0 0 0 2px var(--accent-blue);
          background: var(--bg-glass-heavy);
        }
      `}</style>
      
      {/* Attachments preview row */}
      {files.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 px-2 sm:px-0">
          {files.map((f, i) => (
            <div
              key={i}
              className="group glass inline-flex max-w-full items-center gap-2 truncate rounded-2xl px-3 py-2 text-sm animate-scaleIn"
              title={f.name}
            >
              <Sparkles className="h-4 w-4 shrink-0 text-[var(--accent-blue)]" />
              <span className="truncate max-w-[12rem] text-[var(--text-primary)]">{f.name}</span>
              <button
                type="button"
                className="ml-1 rounded-full p-1 text-[var(--text-tertiary)] transition-all hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
                aria-label={`Remove ${f.name}`}
                onClick={() => removeFile(i)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced glass composer */}
      <div
        className={`
          relative isolate w-full rounded-3xl p-[1px] transition-all duration-300
          ${focused
            ? 'shadow-[0_0_0_2px_var(--border-focus)] scale-[1.01]'
            : 'shadow-[0_0_0_1px_var(--border-primary)]'
          }
        `}
      >
        {/* Animated border gradient */}
        <div
          className={`
            pointer-events-none absolute -inset-[2px] rounded-[inherit] opacity-0 blur-md transition-opacity duration-500
            ${focused ? 'opacity-100' : ''}
          `}
          style={{
            background: "conic-gradient(from 180deg at 50% 50%, rgba(0,122,255,0.4), rgba(52,168,83,0.4), rgba(255,149,0,0.4), rgba(255,59,48,0.4), rgba(0,122,255,0.4))",
          }}
        />
        
        <div className="relative z-10 flex w-full items-end gap-2 rounded-[inherit] glass-heavy px-2 py-2 transition-all duration-300 sm:px-3">
          {/* Attach button */}
          {showAttach && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={onFilesChosen}
                className="hidden"
                accept=".pdf,.docx,.txt,.md,.csv,.json"
                aria-hidden="true"
                tabIndex={-1}
              />
              <button
                type="button"
                onClick={onPickFiles}
                disabled={trulyDisabled}
                className="hidden sm:inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 glass focus-ring text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                aria-label="Add attachments"
                title="Attach files"
              >
                <Paperclip className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Voice button */}
          {showVoice && (
            <button
              type="button"
              onClick={toggleVoice}
              disabled={trulyDisabled}
              className={`
                hidden sm:inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl 
                transition-all duration-200 hover:scale-105 active:scale-95 focus-ring
                ${isListening 
                  ? 'bg-[var(--accent-red)] text-white shadow-lg' 
                  : 'glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }
              `}
              aria-label={isListening ? "Stop recording" : "Start voice input"}
              title={isListening ? "Stop recording" : "Voice input"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}

          {/* Textarea */}
          <div className="flex min-w-0 flex-1 items-center">
            <textarea
              ref={taRef}
              value={value}
              disabled={trulyDisabled}
              onChange={(e) => {
                const next = typeof maxLength === "number" ? e.target.value.slice(0, maxLength) : e.target.value;
                setValue(next);
              }}
              onKeyDown={onKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={isListening ? "🎤 Listening..." : placeholder}
              className="block w-full resize-none border-0 bg-transparent px-4 py-3 text-[15px] leading-6 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none max-h-[40vh] min-h-[44px] overflow-y-auto scroll-area"
              rows={1}
              aria-label="Message input"
              spellCheck
              maxLength={maxLength}
            />
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={`
              group relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl 
              transition-all duration-200 focus:outline-none
              ${canSend 
                ? 'hover:scale-105 active:scale-95 bg-gradient-to-r from-[var(--accent-blue)] to-blue-600 text-white shadow-md hover:shadow-lg' 
                : 'glass opacity-50 cursor-not-allowed text-[var(--text-tertiary)]'
              }
            `}
            aria-label="Send message"
          >
            {/* Background shine effect */}
            {canSend && (
              <>
                <span className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                  <span className="absolute -inset-x-6 -top-8 h-12 rounded-full bg-white/30 blur-md" />
                </span>
              </>
            )}
            
            {isGenerating ? (
              <Loader2 className="relative z-10 h-5 w-5 animate-spin" />
            ) : (
              <Send className="relative z-10 h-5 w-5 transition-transform group-active:scale-95" />
            )}
          </button>
        </div>
      </div>

      {/* Footer with file count and character limit */}
      <div className="mt-2 flex items-center justify-between px-2 text-xs text-[var(--text-tertiary)]">
        <span className="truncate">
          {files.length > 0 ? (
            <span className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              {files.length} file{files.length !== 1 ? 's' : ''} ready
            </span>
          ) : isListening ? (
            <span className="flex items-center gap-1 text-[var(--accent-red)]">
              <div className="h-2 w-2 rounded-full bg-[var(--accent-red)] animate-pulse" />
              Recording...
            </span>
          ) : (
            "\u00A0"
          )}
        </span>
        {typeof remaining === "number" && (
          <span className={remaining < 50 ? 'text-[var(--accent-orange)]' : ''}>
            {remaining} characters left
          </span>
        )}
      </div>
    </div>
  );
}