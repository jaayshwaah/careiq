"use client";

type ChatRole = "system" | "user" | "assistant";
type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string; // ISO
};

function bubbleClasses(role: ChatRole) {
  if (role === "assistant") return "bg-neutral-50 border border-neutral-200";
  if (role === "user") return "bg-white border border-neutral-200";
  return "bg-white";
}

export default function MessageList({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="flex flex-col gap-4">
      {messages.map((m) => (
        <div key={m.id} className="flex">
          <div className={["max-w-full rounded-2xl px-4 py-3", bubbleClasses(m.role)].join(" ")}>
            <div className="text-xs font-medium text-neutral-500 mb-1">
              {m.role === "user" ? "You" : m.role === "assistant" ? "CareIQ" : "System"}
            </div>
            {m.content ? (
              <div className="prose prose-neutral">
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            ) : (
              <div className="text-neutral-400 text-sm italic">…</div>
            )}
            <div className="mt-1 text-[11px] text-neutral-400">
              {new Date(m.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
