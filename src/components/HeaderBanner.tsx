"use client";

import React, { useMemo, useState } from "react";

const HEADERS = [
  "Ready when you are.",
  "Here whenever you’re ready.",
  "Let’s get this done.",
  "What can I help with today?",
  "Tell me what you need.",
  "How can I make your day easier?",
  "Your HR sidekick is on.",
  "I’m listening — what’s up?",
];

export default function HeaderBanner() {
  // Pick once per mount (no timer), so it changes on refresh/page-visit only
  const [index] = useState(() => Math.floor(Math.random() * HEADERS.length));
  const title = useMemo(() => HEADERS[index], [index]);

  return (
    <div className="w-full">
      <div className="mx-auto max-w-3xl px-4 pt-12 pb-4 text-center">
        <h1
          className="font-semibold tracking-tight leading-tight select-none"
          style={{ color: "var(--text)", fontSize: "clamp(2.25rem, 6vw, 3.25rem)" }}
          aria-live="polite"
        >
          {title}
        </h1>
      </div>
    </div>
  );
}
