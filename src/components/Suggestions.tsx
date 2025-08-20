// src/components/Suggestions.tsx
"use client";

import React from "react";

export type SuggestionsProps = {
  /** Called when a chip is clicked. Parent decides what to do with the text. */
  onPick?: (text: string) => void;
  /** (Optional) Provide your own list. If omitted, defaults to nursing-home set. */
  items?: string[];
  /** (Optional) id of a textarea to focus after picking (nice UX on desktop). */
  targetId?: string;
  className?: string;
};

const DEFAULT_SUGGESTIONS: string[] = [
  "Summarize the latest PBJ submission steps and common pitfalls.",
  "Draft a gentle reminder to staff about completing in‑service training this week.",
  "Help me prepare for our DOH survey — top 10 readiness checks.",
  "Create a script to call families about updated visitation policies.",
  "Write a step‑by‑step for onboarding a new CNA in Rippling.",
  "Explain how to calculate overtime correctly for double shifts.",
  "Make a checklist for monthly QA on MAR/TAR documentation.",
  "Draft a message to nurse managers about weekend staffing coverage.",
];

export default function Suggestions({
  onPick,
  items,
  targetId,
  className,
}: SuggestionsProps) {
  const list = items?.length ? items : DEFAULT_SUGGESTIONS;

  const handleClick = (s: string) => {
    // Put text in parent state (not sent).
    onPick?.(s);

    // Optional: focus composer control by id (if provided).
    if (targetId) {
      const el = document.getElementById(targetId) as HTMLTextAreaElement | null;
      if (el) {
        // Append or replace? We’ll replace for clarity; tweak as desired.
        el.focus();
      }
    }
  };

  return (
    <div
      className={[
        "rounded-2xl border border-black/10 dark:border-white/10",
        "bg-white/70 dark:bg-black/30 backdrop-blur",
        "px-3 py-2 md:px-4 md:py-3",
        className || "",
      ].join(" ")}
      aria-label="Suggested prompts"
    >
      <div className="flex flex-wrap gap-2">
        {list.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(s)}
            className={[
              "truncate max-w-full",
              "rounded-full px-3 py-2 text-sm",
              "bg-black/[.04] hover:bg-black/[.06] focus:outline-none focus:ring-2 focus:ring-black/20",
              "dark:bg-white/[.07] dark:hover:bg-white/[.12] dark:focus:ring-white/20",
              "shadow-[0_1px_0_rgba(255,255,255,.45),_0_.5px_1px_rgba(0,0,0,.06)]",
            ].join(" ")}
            aria-label={`Use suggestion: ${s}`}
            title={s}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
