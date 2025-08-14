"use client";

import { cn } from "@/lib/utils";

type ChatRole = "system" | "user" | "assistant";
type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string; // ISO
};

function Avatar({ role }: { role: ChatRole }) {
  // Simple dot avatars approximating ChatGPT layout
  const base =
    "h-7 w-7 shrink-0 rounded-full grid place-content-center text-[11px] font-semibold";
  if (role === "assistant") {
    return <div className={cn(base, "bg-black text-white")}>CI</div>;
  }
  if (role === "user") {
    return <div className={cn(base, "bg-neutral-200 text-neutral-700")}>You</div>;
  }
  return <div className={cn(base, "bg-neutral-100 text-neutral-500")}>Sys</div>;
}

export default function MessageList({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="flex flex-col gap-6">
      {messages.map((m) => (
        <div key={m.id} className="flex gap-3">
          <Avatar role={m.role} />
          <div className="min-w-0 flex-1">
            {/* Name line */}
            <div className="mb-1 text-xs font-medium text-neutral-500">
              {m.role === "assistant" ? "CareIQ" : m.role === "user" ? "You" : "System"}
              <span className="ml-2 text-[11px] text-neutral-400">
                {new Date(m.createdAt).toLocaleString()}
              </span>
            </div>

            {/* Bubble */}
            <div
              className={cn(
                "prose prose-neutral max-w-none",
                "rounded-2xl border",
                m.role === "assistant"
                  ? "bg-neutral-50 border-neutral-200"
                  : m.role === "user"
                  ? "bg-white border-neutral-200"
                  : "bg-white border-neutral-100"
              )}
            >
              <div className="px-4 py-3">
                <p className="whitespace-pre-wrap leading-7">{m.content}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
