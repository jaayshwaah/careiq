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

type Props = {
  subline?: string;
};

export default function HeaderBanner({
  subline = "Start with a prompt below or type your own.",
}: Props) {
  const [title] = React.useState<string>(() => {
    const idx = Math.floor(Math.random() * HEADERS.length);
    return HEADERS[idx];
  });

  return (
    <div
      className="sticky top-0 z-10"
      style={{
        background: "var(--panel)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1
          className="text-xl sm:text-2xl font-semibold tracking-tight"
          style={{ color: "var(--text)" }}
        >
          {title}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
          {subline}
        </p>
      </div>
    </div>
  );
}
