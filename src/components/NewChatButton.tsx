"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Props = {
  className?: string;
  label?: string;
  /** If your app navigates to a conversation page, pass a builder here. */
  toConversationHref?: (id: string) => string;
};

export default function NewChatButton({
  className,
  label = "New Chat",
  toConversationHref,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  const onClick = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "New chat" }),
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      // API returns: { ok: true, conversation: {...} }
      const id = data?.conversation?.id;

      if (id && toConversationHref) {
        router.push(toConversationHref(id));
      } else {
        // No dedicated page? just refresh the list
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to create chat");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={className ?? "rounded-xl px-3 py-2 border text-sm hover:bg-neutral-900/10 disabled:opacity-60"}
      aria-busy={loading}
    >
      {loading ? "Creating..." : label}
    </button>
  );
}

async function safeJson(r: Response) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}
