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
  // Example: wire new chat callback & example chats
  const handleNewChat = async () => {
    try {
      // If you already have an API route to create chats, call it here.
      await fetch("/api/chats", { method: "POST" });
      // Optionally refresh router or redirect.
      // router.refresh()
    } catch (e) {
      console.error(e);
    }
  };

  const exampleChats = [
    // Replace with your fetched chats
    // { id: "123", title: "Welcome to CareIQ" },
  ];

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider defaultTheme="light">
          <div className="min-h-screen grid" style={{ gridTemplateColumns: "auto 1fr" }}>
            <Sidebar chats={exampleChats} onNewChat={handleNewChat} />
            <main className="min-h-screen">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
