/* 
   FILE: src/components/ThemeProvider.tsx
   Safe implementation without circular dependencies
*/

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [systemPreference, setSystemPreference] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  // Get system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemPreference = () => {
      setSystemPreference(mediaQuery.matches ? "dark" : "light");
    };

    updateSystemPreference();
    mediaQuery.addEventListener("change", updateSystemPreference);
    
    // Load saved theme
    try {
      const saved = localStorage.getItem("careiq-theme") as Theme;
      if (saved && ["light", "dark", "system"].includes(saved)) {
        setThemeState(saved);
      } else {
        // Set system as default if no preference saved
        setThemeState("system");
        localStorage.setItem("careiq-theme", "system");
      }
    } catch (e) {
      console.warn("Could not load theme from localStorage");
      setThemeState("system");
    }

    setMounted(true);

    return () => mediaQuery.removeEventListener("change", updateSystemPreference);
  }, []);

  // Calculate resolved theme
  const resolvedTheme: ResolvedTheme = theme === "system" ? systemPreference : theme;

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
  }, [resolvedTheme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("careiq-theme", newTheme);
    } catch (e) {
      console.warn("Could not save theme to localStorage");
    }
  };

  const value: ThemeContextValue = {
    theme,
    resolvedTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Simple theme toggle button
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-10 h-10 rounded-lg bg-gray-200 animate-pulse" />;
  }

  const cycleTheme = () => {
    const themes: Theme[] = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <button
      onClick={cycleTheme}
      className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
      title={`Current: ${theme}`}
    >
      {theme === "light" && "☀️"}
      {theme === "dark" && "🌙"}
      {theme === "system" && "💻"}
    </button>
  );
}