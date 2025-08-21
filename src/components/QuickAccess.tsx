// src/components/QuickAccess.tsx
"use client";

export default function QuickAccess({ onPick }: { onPick: (text: string) => void }) {
  const items = [
    "Infection Control Requirements — summarize 42 CFR 483.80 and CMS Appendix PP with effective dates and common F‑tags.",
    "Staffing Ratios & Requirements — outline federal minimums and MA‑specific rules; include citations.",
    "Resident Rights & Privacy — HIPAA + 42 CFR 483.10 key points; note state variations.",
    "Quality Assurance Reporting — QAPI requirements, documentation, and timelines; cite source documents.",
    "Medication Management — storage, labeling, error reporting; cite 42 CFR and state pharmacy regs.",
    "Emergency Preparedness — 42 CFR 483.73 plan elements, training cadence, and drills; include effective dates.",
  ];

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">What do you need today?</h1>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {items.map((t, i) => (
          <button
            key={i}
            onClick={() => onPick(t)}
            className="rounded-full border border-zinc-200 bg-white/70 px-4 py-2 text-sm shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/50 hover:bg-white hover:shadow transition"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
