import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "CareIQ Chat",
  description: "ChatGPT-style UI with Apple-like polish",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const initialChats: any[] = [];

  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={{
        // Prefer SF Pro stack
        fontFamily:
          'ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
      }}
    >
      <body
        className="bg-[color-mix(in_oklab,white,transparent_2%)] text-zinc-900 antialiased"
        style={
          {
            // consistent radiuses
            // tailwind classes are already used; this ensures the vibe everywhere
          } as React.CSSProperties
        }
      >
        <AppShell initialChats={initialChats}>{children}</AppShell>
      </body>
    </html>
  );
}
