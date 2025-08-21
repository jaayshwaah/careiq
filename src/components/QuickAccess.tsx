// src/components/QuickAccess.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Profile = { role?: string | null };
export default function QuickAccess({
  onPick,
  max = 4,
  compact = false,
}: {
  onPick: (text: string) => void;
  max?: number; // 3–4 suggestions
  compact?: boolean; // for tighter spacing inside sticky composer
}) {
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/profile");
        const j = await r.json();
        const p: Profile | null = j?.profile ?? null;
        setRole((p?.role || "").trim());
      } catch {
        setRole("");
      }
    })();
  }, []);

  const base: string[] = [
    "Summarize key compliance steps for my facility.",
    "What should I prep for the next survey?",
    "Create a quick policy checklist for my team.",
    "Explain today’s top risk areas briefly.",
    "Outline training topics for this quarter.",
  ];

  const forAdmin: string[] = [
    "Top 3 staffing compliance priorities this week?",
    "Draft a brief QAPI update outline.",
    "What’s due on our compliance calendar soon?",
  ];

  const forDON: string[] = [
    "Quick med pass audit checklist.",
    "Daily infection control checks summary.",
    "Top items for CNA huddle today?",
  ];

  const forInfection: string[] = [
    "Daily infection surveillance checklist.",
    "PPE audit talking points.",
    "Policy update: isolation precautions summary.",
  ];

  const extras =
    role.toLowerCase().includes("admin")
      ? forAdmin
      : role.toLowerCase().includes("director of nursing") ||
        role.toLowerCase().includes("don")
      ? forDON
      : role.toLowerCase().includes("infection")
      ? forInfection
      : [];

  // pick 3–4 unique prompts
  const list = useMemo(() => {
    const pool = [...extras, ...base];
    const seen = new Set<string>();
    const picked: string[] = [];
    for (const p of pool) {
      if (picked.length >= max) break;
      if (seen.has(p)) continue;
      seen.add(p);
      picked.push(p);
    }
    return picked;
  }, [extras, max]);

  return (
    <div
      className={cn(
        "relative mt-2",
        compact ? "mx-auto w-full max-w-3xl" : "mx-auto w-full max-w-3xl"
      )}
    >
      {/* animated gradient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 -inset-y-2 -z-10 opacity-60 blur-2xl"
        style={{
          background:
            "radial-gradient(1200px 300px at 50% 0%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(800px 260px at 10% 80%, rgba(34,197,94,0.14), transparent 60%), radial-gradient(900px 260px at 90% 80%, rgba(244,63,94,0.14), transparent 60%)",
          animation: "pulseGlow 6s ease-in-out infinite",
        }}
      />
      <style jsx>{`
        @keyframes pulseGlow {
          0%,
          100% {
            opacity: 0.55;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.02);
          }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {list.map((t, i) => (
          <button
            key={i}
            onClick={() => onPick(t)}
            className={cn(
              "rounded-full border border-zinc-200/80 bg-white/80 px-4 py-2 text-sm shadow-sm backdrop-blur transition hover:bg-white",
              "ring-1 ring-transparent hover:ring-zinc-200"
            )}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
