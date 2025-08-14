"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAutoResize } from "@/hooks/useAutoResize";
import { Button } from "@/components/ui/button";
import { Paperclip, ArrowUpCircle, Square } from "lucide-react";

type ComposerProps = {
  placeholder?: string;
  disabled?: boolean;
  onSend: (text: string) => void | Promise<void>;
  value?: string;
  onChange?: (text: string) => void;
  onAttachClick?: () => void;
  className?: string;

  /** Streaming state + handler to STOP generation */
  isStreaming?: boolean;
  onStop?: () => void;
};

export default function Composer({
  placeholder = "Type your message…",
  disabled,
  onSend,
  value,
  onChange,
  onAttachClick,
  className,
  isStreaming,
  onStop,
}: ComposerProps) {
  const [inner, setInner] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const text = typeof value === "string" ? value : inner;
  const setText = (v: string) => {
    if (typeof value === "string") onChange?.(v);
    else setInner(v);
  };

  // Auto-resize up to 50vh
  const textareaRef = useAutoResize<HTMLTextAreaElement>({
    maxPx: Math.floor(window.innerHeight * 0.5),
  });

  const doSend = async () => {
    const content = text.trim();
    if (!content || disabled || isStreaming) return;
    try {
      setSending(true);
      await onSend(content);
      setText("");
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          el.style.height = "auto";
          el.style.overflowY = "hidden";
        }
      });
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for newline. Block while streaming.
    if (!isStreaming && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void doSend();
    }
  };

  const busy = !!disabled || sending;

  return (
    <div
      className={cn(
        "w-full rounded-2xl ring-1 ring-black/10 dark:ring-white/10 bg-white/70 dark:bg-white/10 shadow-soft",
        "px-2 py-2 sm:px-3 sm:py-2",
        className
      )}
    >
      <div className="flex items-end gap-2">
        {/* Attach (optional) */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onAttachClick}
          disabled={busy}
          className="shrink-0 rounded-xl hover:bg-black/10 dark:hover:bg-white/10"
          aria-label="Attach file"
          title="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            rows={1}
            spellCheck
            disabled={busy}
            className={cn(
              "w-full resize-none overflow-hidden bg-transparent outline-none",
              "rounded-xl px-2 py-2 sm:px-3 sm:py-2",
              "text-sm sm:text-[15px]"
            )}
            style={{ maxHeight: "50vh" }}
          />
          <div className="px-2 sm:px-3 pb-1 pt-0.5 text-[11px] text-ink-subtle">
            Press <kbd className="px-1 py-0.5 rounded border border-black/20 dark:border-white/20">Shift</kbd>+<kbd className="px-1 py-0.5 rounded border border-black/20 dark:border-white/20">Enter</kbd> for newline
          </div>
        </div>

        {/* Right-side action: Send or Stop */}
        {isStreaming ? (
          <Button
            type="button"
            onClick={onStop}
            className="shrink-0 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30 ring-1 ring-red-300/60 dark:ring-red-500/30"
            title="Stop generating"
            aria-label="Stop generating"
          >
            <Square className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={doSend}
            disabled={busy || !text.trim()}
            className="shrink-0 rounded-xl"
            aria-label="Send message"
            title="Send message"
          >
            <ArrowUpCircle className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
