// src/app/api/title/route.ts - resilient chat titling with cost optimization
import { NextRequest, NextResponse } from "next/server";
import { generateTitle } from "@/lib/titler";
import { supabaseService } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Rate limiting: prevent excessive titling requests
const titleRequests = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const key = `${ip}-${Math.floor(now / RATE_LIMIT_WINDOW)}`;
  const count = titleRequests.get(key) || 0;
  
  if (count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  titleRequests.set(key, count + 1);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const { chatId, userText, assistantText } = await req.json();
    if (!chatId || !userText || !assistantText) {
      return NextResponse.json({ ok: false, error: "chatId, userText, assistantText required" }, { status: 400 });
    }

    // Rate limiting by IP
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                     req.headers.get("x-real-ip") || "unknown";
    
    if (isRateLimited(clientIP)) {
      return NextResponse.json({ 
        ok: true, 
        title: "New Chat",
        note: "Rate limited, using default title" 
      });
    }

    // Check if chat already has a custom title (avoid re-titling)
    try {
      const supa = supabaseService();
      const { data: existingChat } = await supa
        .from("chats")
        .select("title")
        .eq("id", chatId)
        .single();
        
      if (existingChat?.title && existingChat.title !== "New Chat") {
        return NextResponse.json({ 
          ok: true, 
          title: existingChat.title,
          note: "Using existing title" 
        });
      }
    } catch {}

    let title = "New Chat";
    let generationMethod = "fallback";
    
    try {
      title = await generateTitle({ userText, assistantText, timeoutMs: 1500 });
      generationMethod = title === "New Chat" ? "fallback" : "ai";
    } catch (error) {
      console.warn("Title generation failed:", error);
    }

    // Persist to chats table (best-effort)
    try {
      const supa = supabaseService();
      await supa.from("chats").update({ 
        title,
        updated_at: new Date().toISOString()
      }).eq("id", chatId);
    } catch (error) {
      console.warn("Failed to update chat title:", error);
    }

    return NextResponse.json({ 
      ok: true, 
      title,
      method: generationMethod 
    });
  } catch (e: any) {
    console.error("Title API error:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "internal error" 
    }, { status: 500 });
  }
}
