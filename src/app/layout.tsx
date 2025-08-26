/* 
   FILE: src/app/layout.tsx
   Fixed version with proper viewport handling
*/

import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "CareIQ Chat",
  description: "AI-powered nursing home compliance and operations assistant",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CareIQ",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const initialChats: any[] = [];

  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={{
        fontFamily:
          'ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
      }}
    >
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
        <ThemeProvider defaultTheme="system" enableSystem>
          <AppShell initialChats={initialChats}>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}