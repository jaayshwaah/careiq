// src/components/Composer.tsx - Simplified version compatible with your existing setup
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Send, Paperclip, X, Loader2 } from "lucide-react";

type ComposerProps = {
  onSend: (text: string, files?: File[]) => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  size?: "sm" | "md" | "lg";
  showAttach?: boolean;
  autoFocus?: boolean;
};

export default function Composer({
  onSend,
  placeholder = "Message CareIQ...",
  disabled = false,
  value: controlledValue,
  onChange,
  size = "md",
  showAttach = true,
  autoFocus = false,
}: ComposerProps) {
  const [internalValue, setInternalValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [focused, setFocused] = useState(false);
  const [sending, setSending] = useState(false);

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const setValue = isControlled ? onChange || (() => {}) : setInternalValue;

  // Auto-resize textarea
  const fit = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const next = Math.min(ta.scrollHeight, Math.round(window.innerHeight * 0.4));
    ta.style.height = `${next}px`;
  }, []);

  useEffect(() => {
    fit();
  }, [value, fit]);

  useEffect(() => {
    if (autoFocus && taRef.current) {
      taRef.current.focus();
    }
  }, [autoFocus]);

  const handleSend = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || sending) return;
    
    setSending(true);
    try {
      await onSend(trimmed, files);
      setValue("");
      setFiles([]);
      requestAnimationFrame(fit);
    } catch (e) {
      console.error("Send failed:", e);
    } finally {
      setSending(false);
    }
  }, [value, files, onSend, disabled, sending, setValue, fit]);

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

  const canSend = value.trim().length > 0 && !disabled && !sending;

  return (
    <div className="w-full">
      {/* File attachments preview */}
      {files.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="inline-flex max-w-full items-center gap-2 truncate rounded-lg px-3 py-2 text-sm bg-blue-50 border border-blue-200"
              title={f.name}
            >
              <Paperclip className="h-4 w-4 shrink-0 text-blue-600" />
              <span className="truncate max-w-[12rem] text-blue-800">{f.name}</span>
              <button
                type="button"
                className="ml-1 rounded-full p-1 text-blue-600 hover:bg-blue-100"
                onClick={() => removeFile(i)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main composer */}
      <div
        className={`
          relative w-full rounded-2xl transition-all duration-300 
          bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm
          ${focused ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md'}
        `}
      >
        <div className="flex w-full items-end gap-2 px-3 py-2">
          {/* Attach button */}
          {showAttach && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={onFilesChosen}
                className="hidden"
                accept=".pdf,.docx,.doc,.txt,.md,.csv,.xlsx,.xls"
              />
              <button
                type="button"
                onClick={onPickFiles}
                disabled={disabled}
                className="h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hidden sm:flex"
                title="Attach files"
              >
                <Paperclip className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Textarea */}
          <div className="flex min-w-0 flex-1 items-center">
            <textarea
              ref={taRef}
              value={value}
              disabled={disabled}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={placeholder}
              className="block w-full resize-none border-0 bg-transparent outline-none max-h-[40vh] min-h-[44px] overflow-y-auto text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 px-4 py-3 text-base"
              rows={1}
              spellCheck
            />
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={`
              h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-200 flex
              ${canSend 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg hover:scale-105' 
                : 'bg-gray-100 dark:bg-gray-700 opacity-50 cursor-not-allowed text-gray-400'
              }
            `}
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="mt-2 text-xs text-gray-500 px-2 text-center">
        ⌘/Ctrl+K to search • ⌘/Ctrl+Enter to send • Shift+Enter for newline
      </div>

      {/* Footer info */}
      {files.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 px-2">
          {files.length} file{files.length !== 1 ? 's' : ''} ready to send
        </div>
      )}

      {/* AI Disclaimer */}
      <div className="mt-3 text-xs text-center text-gray-500 dark:text-gray-400 px-2">
        CareIQ AI can make mistakes. Check important information and verify compliance requirements.
      </div>
    </div>
  );
}