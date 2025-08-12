"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Conversation = {
  id: string;
  title: string | null;
  created_at?: string;
};

export default function Sidebar() {
  const [convos, setConvos] = React.useState<Conversation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    let mounted = true;

    fetch("/api/conversations?limit=50")
      .then((r) => r.json())
      .then((d) => {
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

  async function createConversation() {
    try {
      setCreating(true);
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
      if (id) {
        // navigate if you have a chat page, else refresh
        router.push(`/chat/${id}`);
      } else {
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not create conversation");
    } finally {
      setCreating(false);
    }
  }

  return (
    <aside className="flex h-full w-72 flex-col bg-[rgb(17,17,17)] text-neutral-200 border-r border-neutral-800">
      {/* Header / Logo */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 py-3 border-b border-neutral-800 bg-[rgb(17,17,17)]/90 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 group">
          {/* Use your own logo path if you have one at /logo.svg */}
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 shadow-md group-hover:scale-105 transition-transform" />
          <span className="font-semibold tracking-tight text-neutral-100">CareIQ</span>
        </Link>

        <button
          onClick={createConversation}
          disabled={creating}
          className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800 disabled:opacity-60"
          aria-busy={creating}
        >
          {creating ? "Creating…" : "New Chat"}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="p-3 text-sm text-neutral-400">Loading…</div>
        ) : error ? (
          <div className="p-3 text-sm text-red-400">{error}</div>
        ) : convos.length === 0 ? (
          <div className="p-3 text-sm text-neutral-400">No conversations yet</div>
        ) : (
          <ul className="h-full overflow-auto py-2">
            {convos.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/chat/${c.id}`}
                  className="group mx-2 mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-neutral-800/70 transition-colors"
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-neutral-500 group-hover:bg-neutral-300" />
                  <span className="truncate text-neutral-200 group-hover:text-white">
                    {c.title || "Untitled"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer / Account */}
      <div className="border-t border-neutral-800 px-3 py-3">
        <button
          className="w-full flex items-center justify-between rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800"
          onClick={() => {
            // If you have a settings page, navigate there:
            window.location.href = "/settings";
          }}
        >
          <span className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-700 text-[11px]">
              U
            </span>
            <span className="text-neutral-200">Account</span>
          </span>
          <span className="text-neutral-400">Settings ›</span>
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
