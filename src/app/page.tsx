"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        // Try to get the latest chat from the server
        const listResp = await fetch("/api/chats", { cache: "no-store" });
        if (listResp.ok) {
          const json = await listResp.json();
          const latestId: string | undefined = json?.data?.[0]?.id;
          if (latestId) {
            router.replace(`/chat/${latestId}`);
            return;
          }
        }

        // If none, create one
        const createResp = await fetch("/api/chats", { method: "POST" });
        if (createResp.ok) {
          const created = await createResp.json();
          router.replace(`/chat/${created.id}`);
          return;
        }

        // Final fallback -> stay here (error boundary will catch if needed)
        console.error("Failed to resolve chat route", { listRespStatus: listResp.status, createRespStatus: createResp.status });
      } catch (err) {
        console.error("Home redirect error:", err);
      }
    })();
  }, [router]);

  return null;
}
