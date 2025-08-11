import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CareIQ Chat",
  description: "Apple‑style ChatGPT layout with sidebar and local chat history",
  appleWebApp: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-black text-white">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
