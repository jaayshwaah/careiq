import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "CareIQ Chat",
  description: "ChatGPT-style UI with Apple-like polish",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // You can fetch real chats on the server and pass them to AppShell via props.
  // Leaving empty by default.
  const initialChats: any[] = [];

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider defaultTheme="light">
          <AppShell initialChats={initialChats}>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
