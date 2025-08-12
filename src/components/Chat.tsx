"use client";

import { useRef, useState } from "react";
import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Msg = { role: "user" | "assistant"; content: string };

export default function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I’m CareIQ. How can I help today?" },
  ]);
  const [input, setInput] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setMsgs((m) => [...m, { role: "user", content: text }]);
    setInput("");

    // Placeholder simulated reply for UI testing
    setTimeout(() => {
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Here’s a thoughtful response. (Wire up your /api/chat to stream real replies.)",
        },
      ]);
    }, 350);
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col gap-4">
      {/* Conversation */}
      <div className="glass flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {msgs.map((m, i) => (
              <div key={i} className={`message ${m.role}`}>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Composer */}
      <form
        ref={formRef}
        onSubmit={onSend}
        className="glass mx-auto w-full max-w-2xl p-2 sm:p-3"
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message CareIQ…"
            className="min-h-[52px] max-h-[40vh] resize-y rounded-xl border-0 bg-transparent focus-visible:ring-0"
          />
          <Button
            type="submit"
            className="rounded-xl px-3"
            disabled={!input.trim()}
          >
            <SendHorizonal className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
        <div className="mt-2 text-center text-xs text-ink-subtle">
          CareIQ can make mistakes. Consider checking important info.
        </div>
      </form>
    </div>
  );
}
