"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // Grab latest chat; if none, create one
      const { data: chats, error } = await supabase
        .from("chats")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error(error);
        // Just create a new chat as a fallback
      }

      let chatId = chats?.[0]?.id as string | undefined;

      if (!chatId) {
        const resp = await fetch("/api/chats", { method: "POST" });
        const created = await resp.json();
        chatId = created.id;
      }

      router.replace(`/chat/${chatId}`);
    })();
  }, [router]);

  return null;
}
