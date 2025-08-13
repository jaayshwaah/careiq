"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        // Try to load newest chat
        const res = await fetch("/api/chats", { cache: "no-store" });
        let latestId: string | undefined = undefined;
        if (res.ok) {
          const json = await res.json();
          latestId = json?.data?.[0]?.id;
        }
        if (!latestId) {
          const created = await fetch("/api/chats", { method: "POST" });
          const json = await created.json();
          latestId = json?.id;
        }
        if (latestId) router.replace(`/chat/${latestId}`);
      } catch (e) {
        // If all else fails, land on /chat which will try again
        router.replace("/chat");
      }
    })();
  }, [router]);

  return null;
}
