/* 
   FILE: src/components/ThemeProvider.tsx
   Fixed version with proper SSR handling
*/

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  systemPreference: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  enableSystem?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "careiq-theme",
  enableSystem = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
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
    return () => mediaQuery.removeEventListener("change", updateSystemPreference);
  }, []);

  // Load theme from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey) as Theme | null;
      if (stored && ["light", "dark", "system"].includes(stored)) {
        setThemeState(stored);
      }
    } catch (error) {
      console.warn("Failed to load theme from storage:", error);
    }
    setMounted(true);
  }, [storageKey]);

  // Calculate resolved theme
  const resolvedTheme: ResolvedTheme = theme === "system" ? systemPreference : theme;

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const isDark = resolvedTheme === "dark";

    // Remove existing theme classes
    root.classList.remove("light", "dark");
    
    // Add new theme class
    root.classList.add(resolvedTheme);
    
    // Update meta theme-color for mobile browsers
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const color = isDark ? "#0a0a0a" : "#f8f9fb";
    
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", color);
    } else {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = color;
      document.head.appendChild(meta);
    }
    
    // Update status bar style for iOS PWA
    let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    const statusBarStyle = isDark ? "black-translucent" : "default";
    
    if (statusBarMeta) {
      statusBarMeta.setAttribute("content", statusBarStyle);
    } else {
      const meta = document.createElement("meta");
      meta.name = "apple-mobile-web-app-status-bar-style";
      meta.content = statusBarStyle;
      document.head.appendChild(meta);
    }
  }, [resolvedTheme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(storageKey, newTheme);
    } catch (error) {
      console.warn("Failed to save theme to storage:", error);
    }
  };

  const value: ThemeContextValue = {
    theme,
    resolvedTheme,
    setTheme,
    systemPreference,
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

// Theme Toggle Button Component with SSR safety
interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ThemeToggle({ className = "", size = "md", showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by not rendering until mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder with the same dimensions
    const sizeClasses = {
      sm: "w-8 h-8",
      md: "w-10 h-10", 
      lg: "w-12 h-12",
    };

    return (
      <div className={`
        glass relative inline-flex items-center justify-center rounded-xl
        transition-all duration-200 opacity-50
        ${sizeClasses[size]} ${className}
      `}>
        <div className="w-4 h-4 rounded-full bg-current opacity-30" />
      </div>
    );
  }

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const iconSize = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  const cycleTheme = () => {
    const themes: Theme[] = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getIcon = () => {
    const size = iconSize[size];
    
    if (theme === "system") {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 0 1-8-8 8 8 0 0 1 8-8z"
            fill="currentColor"
          />
        </svg>
      );
    }
    
    if (resolvedTheme === "dark") {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1-8.313-12.454z"
            fill="currentColor"
          />
        </svg>
      );
    }
    
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4" fill="currentColor" />
        <path
          d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  const getLabel = () => {
    switch (theme) {
      case "light": return "Light";
      case "dark": return "Dark";
      case "system": return "System";
      default: return "";
    }
  };

  return (
    <button
      onClick={cycleTheme}
      className={`
        glass relative inline-flex items-center justify-center rounded-xl
        transition-all duration-200 hover:scale-105 active:scale-95
        focus-ring text-[var(--text-primary)]
        ${sizeClasses[size]} ${className}
      `}
      title={`Theme: ${getLabel()} (click to cycle)`}
      type="button"
    >
      <div className="transition-transform duration-300 hover:rotate-12">
        {getIcon()}
      </div>
      
      {showLabel && (
        <span className="ml-2 text-sm font-medium">{getLabel()}</span>
      )}
      
      {/* Subtle animation ring */}
      <div className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 hover:opacity-100">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-sm" />
      </div>
    </button>
  );
}

// Theme Picker Component (3-option toggle) with SSR safety
interface ThemePickerProps {
  className?: string;
}

export function ThemePicker({ className = "" }: ThemePickerProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`glass inline-flex rounded-xl p-1 opacity-50 ${className}`}>
        <div className="h-10 w-20 bg-current opacity-20 rounded-lg" />
        <div className="h-10 w-20 bg-current opacity-20 rounded-lg mx-1" />
        <div className="h-10 w-20 bg-current opacity-20 rounded-lg" />
      </div>
    );
  }

  const themes: Array<{ value: Theme; label: string; icon: React.ReactNode }> = [
    {
      value: "light",
      label: "Light",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4" fill="currentColor" />
          <path
            d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      value: "dark",
      label: "Dark",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1-8.313-12.454z"
            fill="currentColor"
          />
        </svg>
      ),
    },
    {
      value: "system",
      label: "System",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 0 1-8-8 8 8 0 0 1 8-8z"
            fill="currentColor"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className={`glass inline-flex rounded-xl p-1 ${className}`}>
      {themes.map((themeOption) => (
        <button
          key={themeOption.value}
          onClick={() => setTheme(themeOption.value)}
          className={`
            relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium
            transition-all duration-200 focus-ring
            ${theme === themeOption.value
              ? "bg-[var(--accent-blue)] text-white shadow-md"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]"
            }
          `}
          type="button"
        >
          {themeOption.icon}
          <span>{themeOption.label}</span>
        </button>
      ))}
    </div>
  );
}