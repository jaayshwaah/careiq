// src/app/api/title/route.ts
import { NextResponse } from "next/server";
import { getORConfig, orChatComplete, ORMessage } from "@/lib/openrouter";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const text: string = (body?.text || "").toString().slice(0, 8000); // guard
  const cfg = getORConfig();

  const system: ORMessage = {
    role: "system",
    content:
      "You are a title writer. Return ONLY a very short, clear chat title (max 6 words), no quotes, no punctuation.",
  };
  const user: ORMessage = {
    role: "user",
    content: `Write a short chat title for this content:\n\n${text}`,
  };

  const res = await orChatComplete([system, user], cfg.titleModel, false);
  const data = await res.json().catch(() => ({} as any));
  const title =
    data?.choices?.[0]?.message?.content?.trim()?.replace(/^["'“”]+|["'“”]+$/g, "") || "";

  return NextResponse.json({ title });
}
