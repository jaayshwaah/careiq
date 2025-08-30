// src/app/api/messages/stream/route.ts - Fixed version
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { buildRagContext } from "@/lib/ai/buildRagContext";
import { encryptPHI } from "@/lib/crypto/phi";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are CareIQ, an expert AI assistant powered by GPT-5 for U.S. nursing home compliance and operations.

TOPIC RESTRICTIONS - IMPORTANT:
You MUST stay focused ONLY on nursing home, long-term care, and healthcare compliance topics. 
- DO NOT discuss politics, current events, entertainment, or unrelated subjects
- If asked about non-nursing home topics, politely redirect: "I'm specialized in nursing home compliance and operations. How can I help you with that instead?"
- Focus exclusively on: CMS regulations, state compliance, MDS assessments, survey preparation, staff training, infection control, resident care, and related healthcare topics

COMMUNICATION STYLE:
Write responses in clean, professional prose without asterisks or markdown formatting.
Use plain text with proper paragraphs. When listing items, use numbered lists or write in sentence form.

ALWAYS:
- Cite specific regulation numbers (e.g., "42 CFR 483.12(a)")
- Mention source documents when relevant
- Include effective dates when applicable
- Note state-specific variations when applicable
- Stay within nursing home compliance and operations scope

Keep responses concise but comprehensive, focused on actionable guidance.
When you use retrieved knowledge, cite by bracketed number [1], [2], etc.

If asked "what model is this?" respond: "I am CareIQ, powered by GPT-5, specialized exclusively for nursing home compliance and operations guidance."`;

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.CHAT);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse request
    const { chatId, content, temperature = 0.3, maxTokens = 1500 } = await req.json();
    
    if (!chatId || !content?.trim()) {
      return NextResponse.json({ error: "Missing chatId or content" }, { status: 400 });
    }

    // Get user authentication
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile for context
    const { data: profile } = await supa
      .from("profiles")
      .select("role, facility_id, facility_name, facility_state, full_name")
      .eq("user_id", user.id)
      .single();

    // Build RAG context
    let ragContext = "";
    try {
      ragContext = await buildRagContext({
        query: content,
        facilityId: profile?.facility_id,
        facilityState: profile?.facility_state,
        topK: 6,
        accessToken,
        useVector: true,
      });
    } catch (error) {
      console.warn("RAG context building failed:", error);
    }

    // Get recent chat history
    const { data: recentMessages } = await supa
      .from("messages")
      .select("role, content_enc, content_iv, content_tag")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: false })
      .limit(6);

    // Decrypt messages
    const messages = [];
    if (recentMessages) {
      const { decryptPHI } = await import("@/lib/crypto/phi");
      for (const msg of recentMessages.reverse()) {
        try {
          const decrypted = decryptPHI({
            ciphertext: Buffer.from(msg.content_enc, "base64"),
            iv: Buffer.from(msg.content_iv, "base64"),
            tag: Buffer.from(msg.content_tag, "base64"),
          });
          messages.push({ role: msg.role, content: decrypted });
        } catch (error) {
          console.warn("Failed to decrypt message:", error);
        }
      }
    }

    // Build system prompt with context
    let systemPrompt = SYSTEM_PROMPT;
    if (profile?.role) {
      systemPrompt += `\n\nYou are speaking with a ${profile.role}`;
      if (profile.facility_name) {
        systemPrompt += ` at ${profile.facility_name}`;
      }
      if (profile.facility_state) {
        systemPrompt += ` in ${profile.facility_state}`;
      }
    }
    if (ragContext) {
      systemPrompt += `\n\n${ragContext}`;
    }

    // Save user message first
    const userMsgEncrypted = encryptPHI(content);
    await supa.from("messages").insert({
      chat_id: chatId,
      role: "user",
      content_enc: userMsgEncrypted.ciphertext.toString("base64"),
      content_iv: userMsgEncrypted.iv.toString("base64"),
      content_tag: userMsgEncrypted.tag.toString("base64"),
    });

    // Get OpenRouter config
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-5-chat"; // 🚀 GPT-5 is now available!

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
    }

    // Prepare messages for AI
    const aiMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.slice(-4),
      { role: "user" as const, content }
    ];

    // Call OpenRouter for streaming response
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://careiq.vercel.app",
        "X-Title": process.env.OPENROUTER_SITE_NAME || "CareIQ",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: aiMessages,
        stream: true,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenRouter error:", response.status, error);
      return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
    }

    // Create readable stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let fullResponse = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (data === "[DONE]") continue;
                if (!data) continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || "";
                  if (content) {
                    fullResponse += content;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch (e) {
                  // Skip malformed chunks
                }
              }
            }
          }

          // Save assistant response
          if (fullResponse.trim()) {
            const assistantMsgEncrypted = encryptPHI(fullResponse);
            await supa.from("messages").insert({
              chat_id: chatId,
              role: "assistant",
              content_enc: assistantMsgEncrypted.ciphertext.toString("base64"),
              content_iv: assistantMsgEncrypted.iv.toString("base64"),
              content_tag: assistantMsgEncrypted.tag.toString("base64"),
            });

            // Update chat timestamp
            await supa
              .from("chats")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", chatId);

            // Auto-title after first exchange (user + assistant)
            try {
              const { data: totalMessages } = await supa
                .from("messages")
                .select("id", { count: "exact" })
                .eq("chat_id", chatId);

              // Only auto-title if this is the first complete exchange (2 messages: user + assistant)
              if (totalMessages && totalMessages.length === 2) {
                // Call title generation API in background (cost-optimized)
                fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/title`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Auto-Title': 'true', // Help identify auto-titling requests
                  },
                  body: JSON.stringify({
                    chatId,
                    userText: content,
                    assistantText: fullResponse,
                  }),
                }).catch(error => {
                  console.warn('Auto-title failed:', error);
                });
              }
            } catch (error) {
              console.warn('Auto-title check failed:', error);
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });

  } catch (error) {
    console.error("Stream API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}