import { NextResponse } from "next/server";
import { createEmptyChat } from "@/lib/storage";

export async function GET() {
  // This API is a placeholder for future server storage (Supabase).
  // For now, the client reads from localStorage directly.
  return NextResponse.json({ ok: true });
}

export async function POST() {
  const chat = createEmptyChat();
  return NextResponse.json(chat);
}
