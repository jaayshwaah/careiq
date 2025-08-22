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
  max?: number;
  compact?: boolean;
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
    "What should I prep for the next survey?",
    "Create a quick policy checklist.",
    "Summarize today’s top risks.",
    "Outline this quarter’s training.",
  ];

  const forAdmin: string[] = [
    "Top 3 staffing priorities this week?",
    "Draft a brief QAPI update.",
    "What’s due on the compliance calendar?",
  ];

  const forDON: string[] = [
    "Quick med-pass audit checklist.",
    "Infection control checks for today.",
    "3 items for CNA huddle?",
  ];

  const forInfection: string[] = [
    "Daily infection surveillance checklist.",
    "PPE audit talking points.",
    "Update isolation precautions summary.",
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
      {/* Background feathered glow (no hard cutoffs) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -inset-y-4 -z-10 blur-3xl"
        style={{
          background:
            "radial-gradient(1200px 360px at 50% 0%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(900px 300px at 10% 80%, rgba(34,197,94,0.14), transparent 60%), radial-gradient(900px 300px at 90% 80%, rgba(244,63,94,0.14), transparent 60%)",
          maskImage:
            "radial-gradient(70% 55% at 50% 50%, rgba(0,0,0,0.95), rgba(0,0,0,0.45) 55%, rgba(0,0,0,0) 90%)",
          WebkitMaskImage:
            "radial-gradient(70% 55% at 50% 50%, rgba(0,0,0,0.95), rgba(0,0,0,0.45) 55%, rgba(0,0,0,0) 90%)",
        }}
      />

      <div className="flex flex-wrap items-center justify-center gap-2">
        {list.map((t, i) => (
          <button
            key={i}
            onClick={() => onPick(t)}
            className={cn(
              "relative rounded-full border border-zinc-200/80 bg-white/90 px-4 py-2 text-sm backdrop-blur transition",
              "hover:bg-white",
              // subtle colored glow per bubble
              "shadow-[0_0_0_1px_rgba(24,24,27,0.08),0_6px_18px_rgba(99,102,241,0.15),0_2px_6px_rgba(6,182,212,0.10)]"
            )}
          >
            <span className="relative z-10">{t}</span>
            {/* faint ring around bubble */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-0 rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, rgba(99,102,241,0.25), rgba(6,182,212,0.2), rgba(244,63,94,0.2), rgba(34,197,94,0.2), rgba(99,102,241,0.25))",
                mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                WebkitMask:
                  "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                maskComposite: "exclude",
                WebkitMaskComposite: "xor",
                padding: 1,
                opacity: 0.45,
                filter: "blur(6px)",
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
