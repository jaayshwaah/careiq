"use client";

import React from "react";

const HEADERS = [
  "Here whenever you’re ready.",
  "Ready when you need me.",
  "Let’s get this done.",
  "What can I help with today?",
  "Tell me what you need.",
  "How can I make your day easier?",
  "Your HR sidekick is on.",
  "I’m listening — what’s up?",
];

export default function HeaderBanner() {
  const [title] = React.useState<string>(() => {
    const idx = Math.floor(Math.random() * HEADERS.length);
    return HEADERS[idx];
  });

  return (
    <div className="w-full">
      <div className="mx-auto max-w-3xl px-4 pt-10 pb-4 text-center">
        <h1
          className="font-semibold tracking-tight"
          style={{ color: "var(--text)", fontSize: "clamp(1.5rem, 3vw, 2.25rem)" }}
        >
          {title}
        </h1>
      </div>
    </div>
  );
}
