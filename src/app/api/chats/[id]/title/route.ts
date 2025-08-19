// src/app/api/chats/[id]/title/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** --- Supabase admin (server) --- */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-only!

function admin(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error(
      "Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "careiq-title-api" } },
  });
}

/** --- Small helpers --- */
function sanitizeTitle(raw: string): string {
  let s = (raw || "")
    .replace(/^["“”'`]+|["“”'`]+$/g, "")
    .replace(/[.!?…]+$/g, "")
    .trim();

  // Strip any leading "Title:" etc.
  s = s.replace(/^(title|topic|subject)\s*:\s*/i, "").trim();

  // Hard clamp
  if (s.length > 60) s = s.slice(0, 60).trim();

  // Title Case (lightweight)
  const small = new Set([
    "and", "or", "the", "a", "an", "to", "of", "in", "on", "for", "with",
    "at", "by", "from", "as", "but", "nor", "via"
  ]);
  s = s
    .split(/\s+/)
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && small.has(lower)) return lower;
      return lower.replace(/^\p{L}/u, (c) => c.toUpperCase());
    })
    .join(" ");

  // Avoid empty
  if (!s) s = "New Chat";
  return s;
}

function simpleKeywordTitle(text: string): string {
  // ultra-light fallback if no LLM keys available
  const stop = new Set([
    "the","a","an","and","or","but","if","then","else","for","with","to","of","in","on","at","by",
    "this","that","these","those","is","are","was","were","be","been","being","i","you","we","they",
    "it","my","our","your","their","me","us","them","can","should","could","would","just","like"
  ]);
  const words = (text || "")
    .toLowerCase()
    .replace(/[`"'“”.,!?(){}\[\]:;<>#@^$%&*+=\\/|-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !stop.has(w) && w.length > 2)
    .slice(0, 8);

  let pick = words.slice(0, 6);
  if (pick.length < 2) return "New Chat";
  pick = pick.map((w, i) =>
    i === 0 ? w.replace(/^\p{L}/u, (c) => c.toUpperCase()) : w
  );
  return sanitizeTitle(pick.join(" "));
}

/** --- LLM Providers (OpenRouter / OpenAI) --- */
async function llmTitle(messages: { role: string; content: string }[]) {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const system = {
    role: "system",
    content:
      "You are a titling assistant. Given a short chat snippet, output ONLY a short, clear title (3–6 words) that captures the main task or topic. No quotes, no punctuation, no emojis.",
  };
  const user = {
    role: "user",
    content:
      "Make a concise title for this conversation:\n\n" +
      messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n")
        .slice(0, 4000),
  };

  // Preferred: OpenRouter (lets you pick many models)
  if (openrouterKey) {
    const model =
      process.env.OPENROUTER_TITLE_MODEL ||
      "openrouter/auto"; // let gateway pick a cheap fast model
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openrouterKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [system, user],
        temperature: 0.2,
        max_tokens: 24,
      }),
    });
    if (!r.ok) throw new Error(`OpenRouter HTTP ${r.status}`);
    const j = await r.json();
    const raw =
      j?.choices?.[0]?.message?.content ||
      j?.choices?.[0]?.delta?.content ||
      "";
    return sanitizeTitle(String(raw));
  }

  // Backup: OpenAI (if you have a key)
  if (openaiKey) {
    const model = process.env.OPENAI_TITLE_MODEL || "gpt-4o-mini";
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [system, user],
        temperature: 0.2,
        max_tokens: 24,
      }),
    });
    if (!r.ok) throw new Error(`OpenAI HTTP ${r.status}`);
    const j = await r.json();
    const raw = j?.choices?.[0]?.message?.content || "";
    return sanitizeTitle(String(raw));
  }

  // Last resort (no keys): keyword squeeze from first user message
  const firstUser =
    messages.find((m) => m.role === "user")?.content ||
    messages[0]?.content ||
    "";
  return simpleKeywordTitle(firstUser);
}

/** --- Route: POST -> generate + set chat title --- */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const chatId = params.id;
    const db = admin();

    // fetch a few earliest messages to capture the topic
    const { data: msgs, error: mErr } = await db
      .from("messages")
      .select("role,content,created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(8);

    if (mErr) {
      return NextResponse.json({ ok: false, error: mErr.message }, { status: 500 });
    }
    const minimal = (msgs || []).map((m) => ({
      role: (m.role || "user").toString(),
      content: (m.content || "").toString(),
    }));

    if (!minimal.length) {
      return NextResponse.json(
        { ok: false, error: "No messages for this chat yet." },
        { status: 400 }
      );
    }

    // ensure has both sides (user + assistant) to reduce junk titles
    const hasUser = minimal.some((m) => m.role === "user");
    const hasAssistant = minimal.some((m) => m.role === "assistant");
    if (!hasUser || !hasAssistant) {
      return NextResponse.json(
        { ok: false, error: "Need at least one user and one assistant message." },
        { status: 400 }
      );
    }

    const title = await llmTitle(minimal);

    // persist to chats
    const { error: uErr } = await db.from("chats").update({ title }).eq("id", chatId);
    if (uErr) {
      return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, title });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
