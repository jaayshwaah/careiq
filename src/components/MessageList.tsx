"use client";

import {
  Copy,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Wand2,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ChatRole = "system" | "user" | "assistant";
type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string; // ISO
};

function ActionIcon({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="h-7 w-7 grid place-content-center rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700"
    >
      {children}
    </button>
  );
}

export default function MessageList({
  messages,
  isStreaming,
  streamingId,
}: {
  messages: ChatMessage[];
  isStreaming?: boolean;
  streamingId: string | null;
}) {
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {messages.map((m, i) => {
        const isStreamingThis = isStreaming && streamingId === m.id;
        const noContentYet = isStreamingThis && m.content.length === 0;

        if (m.role === "user") {
          // Right-aligned, pill bubble
          return (
            <div key={m.id} className="flex justify-end">
              <div
                className={cn(
                  "max-w-[65ch] rounded-2xl px-3 py-1.5",
                  "bg-violet-100 text-violet-900"
                )}
              >
                <p className="whitespace-pre-wrap text-[15px] leading-6">{m.content}</p>
              </div>
            </div>
          );
        }

        // Assistant — left aligned
        return (
          <div key={m.id} className="flex">
            <div className="min-w-0">
              {/* If we're waiting on the first token: show spinner + 'Thinking…' */}
              {noContentYet ? (
                <div className="flex items-center gap-2 text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking…</span>
                </div>
              ) : (
                <>
                  <div className="max-w-[65ch] text-[15px] md:text-[16px] leading-7 text-neutral-900">
                    <p className="whitespace-pre-wrap">
                      {m.content}
                      {/* Blinking caret while streaming */}
                      {isStreamingThis && (
                        <span
                          className="inline-block align-[-0.2em] w-[1px] h-[1.2em] bg-neutral-500 ml-0.5 animate-pulse"
                          aria-hidden
                        />
                      )}
                    </p>
                  </div>

                  {/* Action bar */}
                  <div className="mt-3 flex items-center gap-1.5 text-neutral-500">
                    <ActionIcon label="Copy" onClick={() => copy(m.content)}>
                      <Copy className="h-4 w-4" />
                    </ActionIcon>
                    <ActionIcon label="Good response">
                      <ThumbsUp className="h-4 w-4" />
                    </ActionIcon>
                    <ActionIcon label="Bad response">
                      <ThumbsDown className="h-4 w-4" />
                    </ActionIcon>
                    <ActionIcon label="Listen">
                      <Volume2 className="h-4 w-4" />
                    </ActionIcon>
                    <ActionIcon label="Improve writing">
                      <Wand2 className="h-4 w-4" />
                    </ActionIcon>
                    <ActionIcon label="Regenerate">
                      <RotateCcw className="h-4 w-4" />
                    </ActionIcon>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
