import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "CareIQ Chat",
  description: "ChatGPT-style UI with Apple-like polish",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const exampleChats = [
    // Replace with fetched chats server-side if needed
    // { id: "123", title: "Welcome to CareIQ" },
  ];

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider defaultTheme="light">
          <div className="min-h-screen grid" style={{ gridTemplateColumns: "auto 1fr" }}>
            <Sidebar chats={exampleChats} />
            <main className="min-h-screen">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
