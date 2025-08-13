"use client";

import * as React from "react";

/**
 * A minimal theme provider that mirrors next-themes behavior for "class" strategy.
 * - Applies/removes the `dark` class on <html>.
 * - Supports "light" | "dark" | "system" (default from props).
 * - Persists the resolved theme to localStorage ("theme": "light" | "dark" | "system").
 * - React 19 compatible, no external deps.
 */

type Theme = "light" | "dark" | "system";

type Props = {
  children: React.ReactNode;
  defaultTheme?: Theme;     // default "light"
  attribute?: "class";      // only "class" is supported
  enableSystem?: boolean;   // if true, "system" uses prefers-color-scheme
  storageKey?: string;      // default "theme"
  disableTransitionOnChange?: boolean;
};

export function ThemeProvider({
  children,
  defaultTheme = "light",
  attribute = "class",
  enableSystem = true,
  storageKey = "theme",
  disableTransitionOnChange = true,
}: Props) {
  const [theme, setTheme] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    const stored = window.localStorage.getItem(storageKey) as Theme | null;
    return stored ?? defaultTheme;
  });

  // Track system preference if enabled
  const mql = React.useMemo(
    () => (typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : undefined),
    []
  );

  // Optional: disable transitions during theme flip (prevents flicker)
  const withNoTransition = React.useCallback((fn: () => void) => {
    if (!disableTransitionOnChange) return fn();
    const root = document.documentElement;
    const css = root.style.cssText;
    root.style.transition = "none";
    fn();
    // force reflow
    root.offsetHeight; // eslint-disable-line @typescript-eslint/no-unused-expressions
    root.style.cssText = css;
  }, [disableTransitionOnChange]);

  // Compute what we should render as: "dark" or "light"
  const resolved = React.useMemo(() => {
    if (theme === "system" && enableSystem && mql) {
      return mql.matches ? "dark" : "light";
    }
    return theme === "dark" ? "dark" : "light";
  }, [theme, enableSystem, mql]);

  // Apply/remove class on <html>
  React.useEffect(() => {
    if (attribute !== "class") return;

    withNoTransition(() => {
      const root = document.documentElement;
      if (resolved === "dark") root.classList.add("dark");
      else root.classList.remove("dark");
    });

    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {}
  }, [resolved, theme, attribute, storageKey, withNoTransition]);

  // Listen for system changes when in "system"
  React.useEffect(() => {
    if (!enableSystem || theme !== "system" || !mql) return;
    const handler = () => {
      const next = mql.matches ? "dark" : "light";
      withNoTransition(() => {
        const root = document.documentElement;
        if (next === "dark") root.classList.add("dark");
        else root.classList.remove("dark");
      });
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [enableSystem, theme, mql, withNoTransition]);

  // Expose a tiny context in case you want toggles later
  return <>{children}</>;
}
