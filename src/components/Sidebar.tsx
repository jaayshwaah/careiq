"use client";

import * as React from "react";
import Link from "next/link";

type Conversation = {
  id: string;
  title: string | null;
  created_at?: string;
  // add any other columns you have
};

export default function Sidebar() {
  const [convos, setConvos] = React.useState<Conversation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    fetch("/api/conversations?limit=50")
      .then((r) => r.json())
      .then((d) => {
        // API returns: { ok: true, conversations: [...] }
        if (!mounted) return;
        if (d?.ok) {
          setConvos(Array.isArray(d.conversations) ? d.conversations : []);
          setError(null);
        } else {
          setError(d?.error || "Failed to load conversations");
        }
      })
      .catch((e) => {
        if (!mounted) return;
        console.error(e);
        setError("Failed to load conversations");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <aside className="w-72 border-r h-full flex flex-col">
      <div className="p-3 border-b">
        <strong className="text-sm">Your Conversations</strong>
      </div>

      {loading ? (
        <div className="p-3 text-sm text-neutral-500">Loading…</div>
      ) : error ? (
        <div className="p-3 text-sm text-red-600">{error}</div>
      ) : convos.length === 0 ? (
        <div className="p-3 text-sm text-neutral-500">No conversations yet</div>
      ) : (
        <ul className="flex-1 overflow-auto">
          {convos.map((c) => (
            <li key={c.id} className="border-b">
              {/* If you have a conversation page, change href accordingly */}
              <Link
                href={`/chat/${c.id}`}
                className="block px-3 py-2 text-sm hover:bg-neutral-900/5 truncate"
              >
                {c.title || "Untitled"}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="p-3 border-t">
        {/* If you’re using the NewChatButton component, you can drop it in here instead */}
        <button
          className="w-full rounded-xl px-3 py-2 border text-sm hover:bg-neutral-900/10"
          onClick={async () => {
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
              location.reload();
            } catch (e) {
              console.error(e);
              alert(e instanceof Error ? e.message : "Could not create conversation");
            }
          }}
        >
          + New Chat
        </button>
      </div>
    </aside>
  );
}

async function tryJson(r: Response) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}
