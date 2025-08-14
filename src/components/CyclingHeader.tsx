"use client";

import React from "react";
import { cn } from "@/lib/utils";

export default function CyclingHeader({
  name = "Friend",
  className,
  intervalMs = 3000,
}: {
  name?: string;
  className?: string;
  intervalMs?: number;
}) {
  const phrases = React.useMemo(
    () => [
      `Good to see you, ${name}.`,
      "Your HR sidekick is on.",
      "Ask anything. I’ll keep it tidy.",
      "Onboard faster. Fewer headaches.",
      "Policies, payroll, and people—simplified.",
    ],
    [name]
  );

  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % phrases.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, phrases.length]);

  return (
    <div
      aria-live="polite"
      className={cn(
        "select-none text-balance text-center text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight",
        className
      )}
    >
      <span className="inline-block transition-opacity duration-400 ease-in-out">
        {phrases[idx]}
      </span>
    </div>
  );
}
