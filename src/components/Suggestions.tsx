"use client";

import React from "react";

/**
 * Suggested prompts for nursing home staff (random on each page load).
 */
const NURSING_HOME_SUGGESTIONS: string[] = [
  "Summarize the latest PBJ submission steps and common pitfalls.",
  "Draft a gentle reminder to staff about completing in-service training this week.",
  "Help me prepare for our DOH survey — top 10 readiness checks.",
  "Create a script to call families about updated visitation policies.",
  "Write a step-by-step for onboarding a new CNA in Rippling.",
  "Explain how to calculate overtime correctly for double shifts.",
  "Make a checklist for monthly QA on MAR/TAR documentation.",
  "Draft a message to nurse managers about weekend staffing coverage.",
  "Create a quick-reference for incident reporting timelines.",
  "Write a policy snippet on meal & rest breaks for per-diem staff.",
  "Generate interview questions for hiring a Unit Manager (RN).",
  "Provide a template for disciplinary write-ups that’s fair and compliant.",
  "Outline a crash course on PDPM categories for new MDS coordinators.",
  "Make a resident admission checklist for night shift.",
  "Draft a family update on flu season precautions and vaccinations.",
  "How do I export a payroll register and reconcile against the census?",
  "Create a PTO request policy summary for union vs non-union staff.",
  "Give talking points for a stand-up meeting about fall prevention.",
  "Produce a weekly staffing report outline (units, skill mix, OT).",
  "Explain PBJ hours vs. payroll hours and how to align them.",
  "Write an email announcing mandatory LMS modules due Friday.",
  "Help me design a survey-readiness binder table of contents.",
  "Draft a performance improvement plan for medication errors.",
  "What are best practices for agency utilization reduction this month?",
];

type Props = {
  targetId?: string; // textarea id to prefill
  count?: number;    // how many suggestions to show (defaults 4)
};

function pickRandom<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export default function Suggestions({ targetId = "composer-input", count = 4 }: Props) {
  const [items] = React.useState<string[]>(() => pickRandom(NURSING_HOME_SUGGESTIONS, count));

  const handleClick = (text: string) => {
    const el = document.getElementById(targetId) as HTMLTextAreaElement | null;
    if (el) {
      el.value = text;
      // trigger React onChange/auto-resize
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  };

  return (
    <div className="w-full">
      <div className="mx-auto max-w-2xl px-4 pb-4">
        {/* Compact, uniform chips in a 2x2 grid */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((s, i) => (
            <button
              key={i}
              onClick={() => handleClick(s)}
              title="Click to prefill the message"
              className={[
                "w-full rounded-xl border px-3 py-2 text-left text-xs transition",
                "sm:text-sm",
                // Light (default)
                "bg-black/[0.05] border-black/10 text-gray-900",
                "hover:bg-black/[0.08] focus:outline-none focus:ring-2 focus:ring-black/10",
                // Dark
                "dark:bg-white/10 dark:border-white/10 dark:text-white",
                "dark:hover:bg-white/15 dark:focus:ring-white/20",
                // Subtle inner highlight like native chips
                "shadow-[0_1px_0_rgba(255,255,255,.45),_0_.5px_1px_rgba(0,0,0,.06)]",
              ].join(" ")}
              aria-label={`Use suggestion: ${s}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
