"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export default function Header() {
  return (
    <div className="sticky top-0 z-10 mx-auto w-full max-w-3xl px-4">
      <div className="glass mt-2 flex items-center justify-between rounded-2xl px-3 py-2 ring-1 ring-black/10 dark:ring-white/10">
        <Link href="/" className="text-sm font-semibold">
          CareIQ
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="#"
            onClick={async (e) => {
              e.preventDefault();
              try {
                const r = await fetch("/api/chats", { method: "POST" });
                const j = await r.json();
                window.location.assign(`/chat/${j.id}`);
              } catch {}
            }}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm ring-1 ring-black/10 dark:ring-white/10 bg-white/70 hover:bg-white/90 active:bg-white dark:bg白/10 dark:hover:bg-white/15 shadow-soft hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            New chat
          </Link>
        </div>
      </div>
    </div>
  );
}
