import { NextResponse } from "next/server";
import type { Message } from "@/types";

// Minimal mock responder – replace later with OpenRouter or your provider of choice
function basicAIResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("hello") || lower.includes("hi")) return "Hey! How can I help today?";
  if (lower.includes("pbj"))
    return "PBJ (Payroll-Based Journal) reporting requires accurate staffing hours by job code…";
  if (lower.includes("email"))
    return "Here’s a clean draft you can tweak: \n\nSubject: Quick follow-up\n\nHi [Name],\n\n…";
  return `You said: "${prompt}". I'm a demo model right now – plug in a provider to get smarter responses.`;
}

export async function POST(req: Request) {
  const { chatId, message } = (await req.json()) as { chatId: string; message: Message };

  const reply: Message = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: basicAIResponse(message.content),
    createdAt: Date.now(),
  };

  // Simple heuristic for titles
  const title = message.content.split("\n")[0].slice(0, 40);

  return NextResponse.json({ ok: true, message: reply, title });
}
