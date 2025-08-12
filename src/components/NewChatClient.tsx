"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Props = {
  className?: string;
  buttonText?: string;
  toConversationHref?: (id: string) => string;
};

export default function NewChatClient({
  className,
  buttonText = "New Chat",
  toConversationHref,
}: Props) {
  const [pending, setPending] = React.useState(false);
  const router = useRouter();

  const handleNew = async () => {
    setPending(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "New chat" }),
      });

      if (!res.ok) {
        const err = await tryJson(res);
        throw new Error(err?.error || `Failed (${res.status})`);
      }

      const data = await res.json();
      const id = data?.conversation?.id;

      if (id && toConversationHref) {
        router.push(toConversationHref(id));
      } else {
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not create conversation");
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleNew}
      disabled={pending}
      className={className ?? "rounded-xl px-3 py-2 border text-sm hover:bg-neutral-900/10 disabled:opacity-60"}
    >
      {pending ? "Creating..." : buttonText}
    </button>
  );
}

async function tryJson(r: Response) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}
