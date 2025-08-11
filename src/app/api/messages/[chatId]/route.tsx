import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: { chatId: string } }) {
  // Placeholder for when you back with Supabase; client uses localStorage.
  return NextResponse.json({ chatId: params.chatId, messages: [] });
}
