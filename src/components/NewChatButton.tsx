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

  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition ring-1 ring-black/10 dark:ring-white/10 bg-white/70 hover:bg-white/90 active:bg-white dark:bg-white/10 dark:hover:bg-white/15 shadow-soft hover:shadow-md focus:outline-none ${className ?? ""}`}
      disabled={loading}
      onClick={async () => {
        if (loading) return;
        setLoading(true);
        try {
          const resp = await fetch("/api/chats", { method: "POST" });
          const json = await safeJson(resp);
          const id = json?.id || json?.data?.id;
          const href = toConversationHref ? toConversationHref(id) : `/chat/${id}`;
          router.push(href);
        } catch {
        } finally {
          setLoading(false);
        }
      }}
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
