import ChatThreadClient from "@/components/ChatThreadClient";
import type { Chat } from "@/types";

type MessageRow = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
};

// TODO: Replace with your real fetch
async function getMessages(id: string): Promise<MessageRow[]> {
  // Demo data
  return [
    { id: "m1", role: "user", content: "Hello!", created_at: new Date().toISOString() },
    { id: "m2", role: "assistant", content: "Hi there — how can I help?", created_at: new Date().toISOString() },
  ];
}

export default async function ChatThreadPage({
  params,
}: {
  params: { id: string };
}) {
  const rows = await getMessages(params.id);

  // Map to the ChatWindow-friendly shape
  const chat: Chat = {
    id: params.id,
    title: "Chat",
    created_at: rows[0]?.created_at ?? new Date().toISOString(),
    updated_at: rows[rows.length - 1]?.created_at ?? new Date().toISOString(),
    messages: rows.map((r) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      // ChatWindow expects createdAt (camelCase)
      createdAt: r.created_at ?? new Date().toISOString(),
    })),
  } as Chat;

  return (
    <div className="h-full">
      <ChatThreadClient chat={chat} />
    </div>
  );
}
