export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { buildRagContext } from "@/lib/ai/buildRagContext";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

function buildSystemPrompt(opts: {
  role?: string | null;
  facilityState?: string | null;
  facilityName?: string | null;
  ragBlock?: string;
}) {
  const { role, facilityState, facilityName, ragBlock } = opts;
  const roleLine = role ? `User role: ${role}.` : "";
  const facLine =
    facilityName || facilityState
      ? `Facility: ${facilityName ?? "N/A"}; State: ${facilityState ?? "N/A"}.`
      : "";

  return [
    `You are **CareIQ**, an expert assistant for US nursing home compliance and operations.`,
    roleLine,
    facLine,
    ``,
    `ALWAYS:`,
    `- Cite specific regulation numbers (e.g., "42 CFR 483.12(a)").`,
    `- Mention the source document (e.g., "CMS State Operations Manual Appendix PP").`,
    `- Include effective dates when relevant.`,
    `- Note if regulations vary by state. If state-specific guidance exists for the user's state, call it out explicitly.`,
    ``,
    `When you use retrieved knowledge, **cite by bracketed number** matching the "Context" list below, like [1], [2].`,
    `Prefer CMS primary sources; if secondary sources are used, say so.`,
    ``,
    `Output format:`,
    `1) **Answer** (clear, actionable, step-by-step if applicable).`,
    `2) **Compliance Notes** (bullets of risk areas, common survey tags, effective dates).`,
    `3) **Citations** (list CFR numbers, document names, links if available, and [#] references to retrieved context).`,
    `4) **State Variations** (explicitly call out ${facilityState ?? "state-specific"} differences or say "None found").`,
    ragBlock ? `\n${ragBlock}\n` : ``,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { messages, attachments = [], facilityId = null } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ ok: false, error: "messages[] required" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "Missing OPENROUTER_API_KEY" },
        { status: 500 }
      );
    }

    // Get user profile to auto-fill role / state / facility
    const authHeader = (req.headers as any).get?.("authorization") || "";
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = token ? supabaseServerWithAuth(token) : supabaseServerWithAuth();

    const { data: user } = await supa.auth.getUser();
    let role: string | null = null;
    let facilityState: string | null = null;
    let facilityName: string | null = null;
    let facility_id: string | null = facilityId ?? null;

    if (user?.user) {
      const { data: profile } = await supa
        .from("profiles")
        .select("role, facility_id, facility_name, facility_state")
        .eq("user_id", user.user.id)
        .single();
      role = profile?.role ?? null;
      facility_id = profile?.facility_id ?? facility_id;
      facilityState = profile?.facility_state ?? null;
      facilityName = profile?.facility_name ?? null;
    }

    const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
    const lastQuery = String(lastUser?.content || "").slice(0, 2000);

    // Build a RAG context with state preference
    let ragBlock = "";
    try {
      ragBlock = await buildRagContext({
        query: lastQuery,
        facilityId: facility_id,
        facilityState,
        topK: 6,
      });
    } catch {
      ragBlock = "";
    }

    const attNote =
      Array.isArray(attachments) && attachments.length
        ? `\n\n### Attachments (user-provided)\n${attachments
            .map((a: any, i: number) => {
              const head = `(${i + 1}) ${a.name || "Attachment"}`;
              const t = (a.text || "").slice(0, 1800).replace(/\s+/g, " ");
              return `${head}\n${t}${(a.text || "").length > 1800 ? " ..." : ""}`;
            })
            .join("\n\n")}`
        : "";

    const system = buildSystemPrompt({
      role,
      facilityState,
      facilityName,
      ragBlock: `${ragBlock}${attNote}`,
    });

    const model = process.env.OPENROUTER_MODEL || "openai/gpt-5-chat";
    const sendMessages = [{ role: "system", content: system }, ...messages];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://careiq.local",
            "X-Title": "CareIQ Chat",
          },
          body: JSON.stringify({
            model,
            stream: true,
            messages: sendMessages,
            temperature: 0.2,
            max_tokens: 1400,
          }),
        });

        if (!res.ok || !res.body) {
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({
              ok: false,
              error: `Upstream error ${res.status}`,
            })}\n\n`)
          );
          controller.close();
          return;
        }

        const reader = res.body.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    console.error("Complete API error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unexpected server error" }, { status: 500 });
  }
}
