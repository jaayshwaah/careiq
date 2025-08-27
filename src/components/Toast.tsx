/* 
   FILE: src/components/Toast.tsx
   Simple toast notification component
*/

"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ToastProps = {
  open: boolean;
  label: string;
  onClick?: () => void;
  duration?: number;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  className?: string;
};

export default function Toast({
  open,
  label,
  onClick,
  duration = 5000,
  position = "top-right",
  className = "",
}: ToastProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setVisible(true);
      if (duration > 0) {
        const timer = setTimeout(() => {
          setVisible(false);
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      setVisible(false);
    }
  }, [open, duration]);

  if (!mounted || !visible) return null;

  const getPositionClasses = () => {
    switch (position) {
      case "top-left":
        return "top-4 left-4";
      case "top-right":
        return "top-4 right-4";
      case "bottom-left":
        return "bottom-4 left-4";
      case "bottom-right":
        return "bottom-4 right-4";
      default:
        return "top-4 right-4";
    }
  };

  const toast = (
    <div
      className={`
        toast fixed z-50 transition-all duration-300
        ${getPositionClasses()}
        ${visible ? "opacity-100 scale-100" : "opacity-0 scale-95"}
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      <button
        onClick={onClick}
        className="
          glass-heavy px-4 py-3 rounded-xl text-sm font-medium 
          text-[var(--text-primary)] hover:scale-105 active:scale-95
          transition-all duration-200 focus-ring cursor-pointer
          flex items-center gap-3
        "
      >
        <div className="w-2 h-2 rounded-full bg-[var(--accent-blue)] animate-pulse" />
        {label}
      </button>
    </div>
  );

  return createPortal(toast, document.body);
}