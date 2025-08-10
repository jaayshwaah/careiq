"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewChatButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleNewChat = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Failed to create chat (${res.status})`);
      }
      const { id } = await res.json();
      router.push(`/chat/${id}`);
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleNewChat}
      disabled={loading}
      className={`rounded-2xl px-4 py-2 shadow ${loading ? "opacity-70" : ""} ${className}`}
      aria-busy={loading}
    >
      {loading ? "Starting…" : "New Chat"}
    </button>
  );
}
