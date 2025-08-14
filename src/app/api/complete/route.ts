import { NextResponse } from "next/server";
import { complete } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const msgs = (body?.messages ?? []) as Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }>;
    if (!Array.isArray(msgs) || msgs.length === 0) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }

    const text = await complete(msgs);

    return NextResponse.json({
      message: {
        id: `asst_${Math.random().toString(36).slice(2, 10)}`,
        role: "assistant" as const,
        content: text || "Sorry — empty response.",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Completion error" }, { status: 500 });
  }
}
