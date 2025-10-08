"use client";

import Chat from "@/components/Chat";
import { use } from "react";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Chat chatId={id} />;
}
