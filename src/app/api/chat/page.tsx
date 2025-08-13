"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChatIndex() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/chats", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const id = json?.data?.[0]?.id;
          if (id) {
            router.replace(`/chat/${id}`);
            return;
          }
        }
        const created = await fetch("/api/chats", { method: "POST" });
        const json = await created.json();
        router.replace(`/chat/${json?.id}`);
      } catch {
        // stay here quietly
      }
    })();
  }, [router]);

  return null;
}
