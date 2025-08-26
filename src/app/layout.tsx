/* 
   FILE: src/app/layout.tsx
   Replace entire file with this enhanced version
*/

import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "CareIQ Chat",
  description: "AI-powered nursing home compliance and operations assistant",
  themeColor