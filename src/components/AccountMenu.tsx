"use client";

import React from "react";
import { createPortal } from "react-dom";

type AccountMenuProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  email?: string;
  onCustomize?: () => void;
  onSettings?: () => void;
  onHelp?: () => void;
  onLogout?: () => void;
};

function useClickOutside<T extends HTMLElement>(ref: React.RefObject<T>, onOutside: () => void) {
  React.useEffect(() => {
    function handle(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) onOutside();
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onOutside();
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", onEsc);
    };
  }, [ref, onOutside]);
}

export default function AccountMenu({
  open,
  onClose,
  anchorRef,
  email,
  onCustomize,
  onSettings,
  onHelp,
  onLogout,
}: AccountMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, onClose);

  const [style, setStyle] = React.useState<React.CSSProperties>({
    opacity: 0,
    pointerEvents: "none",
  });

  React.useLayoutEffect(() => {
    if (!open) {
      setStyle({ opacity: 0, pointerEvents: "none" });
      return;
    }
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const menuW = 260;
    const menuH = 240;

    let top = rect.bottom + 8;
    let left = rect.left + rect.width - menuW;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (left + menuW > vw - 8) left = vw - menuW - 8;
    if (left < 8) left = 8;
    if (top + menuH > vh - 8) top = rect.top - menuH - 8;

    setStyle({
      position: "fixed",
      top,
      left,
      width: menuW,
      opacity: 1,
      pointerEvents: "auto",
      zIndex: 100,
    });
  }, [open, anchorRef]);

  if (typeof window === "undefined" || !open) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={style}
      className="rounded-2xl border border-black/10 bg-background/95 backdrop-blur-sm shadow-xl dark:border-white/10"
    >
      <div className="px-4 py-3">
        <div className="text-sm font-medium">{email ?? "user@careiq.app"}</div>
        <div className="text-xs text-ink-subtle">Signed in</div>
      </div>
      <div className="h-px bg-black/10 dark:bg-white/10" />
      <nav className="py-1">
        <Item label="Customize CareIQ" onClick={onCustomize ?? onClose} />
        <Item label="Settings" onClick={onSettings ?? onClose} />
        <Item label="Help" onClick={onHelp ?? onClose} />
      </nav>
      <div className="h-px bg-black/10 dark:bg-white/10" />
      <div className="py-1">
        <Item label="Log out" danger onClick={onLogout ?? onClose} />
      </div>
    </div>,
    document.body
  );
}

function Item({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full px-4 py-2 text-left text-sm transition-colors",
        danger
          ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          : "text-foreground hover:bg-black/5 dark:hover:bg-white/10",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
