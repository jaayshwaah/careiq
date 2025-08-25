// src/components/Toast.tsx
"use client";

import React from "react";

type ToastProps = {
  open: boolean;
  label: string;
  onClick?: () => void;
};

export default function Toast({ open, label, onClick }: ToastProps) {
  return (
    <div
      className={[
        "pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 transition",
        open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
      ].join(" ")}
      aria-hidden={!open}
    >
      <button
        type="button"
        onClick={onClick}
        className="pointer-events-auto rounded-2xl border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-black/80 shadow-lg backdrop-blur-xl transition hover:bg-white dark:border-white/10 dark:bg-zinc-900/60 dark:text-white/80"
      >
        {label}
      </button>
    </div>
  );
}
