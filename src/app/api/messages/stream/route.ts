// src/app/api/messages/stream/route.ts - Fixed version
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { buildRagContext } from "@/lib/ai/buildRagContext";
import { encryptPHI } from "@/lib/crypto/phi";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

// Enhanced system prompt
const SYSTEM_PROMPT = `You are CareIQ, an expert assistant for U.S. nursing home operations and compliance.

Write responses in clean, professional prose without asterisks or markdown formatting.
Use plain text with proper paragraphs. When listing items, use numbered lists or write in sentence form.

ALWAYS:
- Cite specific regulation numbers (e.g., "42 CFR 483.12(a)")
- Mention source documents when relevant
- Include effective dates when applicable
- Note state-specific variations when applicable

Keep responses concise but comprehensive, focused on actionable guidance.
When you use retrieved knowledge, cite by bracketed number [1], [2], etc.`;

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const userIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  try {
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

    // Verify chat ownership
    const { data: chat, error: chatError } = await supa
      .from("chats")
      .select("id, user_id")
      .eq("id", chatId)
      .single();

    if (chatError || !chat || chat.user_id !== user.id) {
      return NextResponse.json({ error: "Chat not found or unauthorized" }, { status: 404 });
    }

    // Get user profile for context
    const { data: profile } = await supa
      .from("profiles")
      .select("role, facility_id, facility_name, facility_state, full_name")
      .eq("user_id", user.id)
      .single();

    // Build enhanced RAG context with facility-specific search
    let ragContext = "";
    try {
      ragContext = await buildRagContext({
        query: content,
        facilityId: profile?.facility_id,
        facilityState: profile?.facility_state,
        topK: 8, // Increased for better context
        accessToken,
        useVector: true,
      });
    } catch (error) {
      console.warn("RAG context building failed:", error);
    }

    // Get recent chat history (decrypt on the fly)
    const { data: recentMessages } = await supa
      .from("messages")
      .select("role, content_enc, content_iv, content_tag")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Decrypt and format messages
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
          // Skip corrupted messages
        }
      }
    }

    // Build enhanced system prompt with user context
    let systemPrompt = SYSTEM_PROMPT;
    
    if (profile) {
      const roleContext = profile.role ? `You are speaking with a ${profile.role}` : "You are speaking with a healthcare professional";
      const facilityContext = profile.facility_name 
        ? `at ${profile.facility_name}` 
        : "at a nursing facility";
      const stateContext = profile.facility_state 
        ? `in ${profile.facility_state}` 
        : "";
      const nameContext = profile.full_name 
        ? ` (${profile.full_name})` 
        : "";
      
      systemPrompt += `\n\nIMPORTANT CONTEXT: ${roleContext}${nameContext} ${facilityContext}${stateContext}.`;
      
      // Add role-specific guidance
      if (profile.role?.toLowerCase().includes('administrator')) {
        systemPrompt += `\nAs an administrator, focus on: operational efficiency, regulatory compliance, staff management, budgeting, and facility-wide policies. Provide strategic guidance and management perspectives.`;
      } else if (profile.role?.toLowerCase().includes('director of nursing') || profile.role?.toLowerCase().includes('don')) {
        systemPrompt += `\nAs Director of Nursing, focus on: clinical oversight, nursing staff management, care plan reviews, regulatory nursing requirements, and clinical quality improvement.`;
      } else if (profile.role?.toLowerCase().includes('nurse') && !profile.role?.toLowerCase().includes('director')) {
        systemPrompt += `\nAs a nurse, focus on: direct patient care, clinical procedures, medication administration, documentation requirements, and care plan implementation.`;
      } else if (profile.role?.toLowerCase().includes('cna')) {
        systemPrompt += `\nAs a CNA, focus on: direct resident care, daily living assistance, observation and reporting, documentation, and following care plans.`;
      }
      
      // Add state-specific note
      if (profile.facility_state) {
        systemPrompt += `\n\nSTATE-SPECIFIC: Pay special attention to ${profile.facility_state} state regulations and requirements. When federal and state regulations differ, clearly distinguish between them.`;
      }
    }
    
    if (ragContext) {
      systemPrompt += `\n\n${ragContext}`;
    }     if (ragContext) {
      systemPrompt += `\n\n${ragContext}`;
    }

    // Save user message first
    const userMsgEncrypted = encryptPHI(content);
    const { data: userMessage, error: userMsgError } = await supa
      .from("messages")
      .insert({
        chat_id: chatId,
        role: "user",
        content_enc: userMsgEncrypted.ciphertext.toString("base64"),
        content_iv: userMsgEncrypted.iv.toString("base64"),
        content_tag: userMsgEncrypted.tag.toString("base64"),
      })
      .select("id")
      .single();

    if (userMsgError) {
      console.error("Failed to save user message:", userMsgError);
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
    }

    // Prepare messages for AI (keep context reasonable)
    const aiMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.slice(-6), // Keep last 6 messages for context
      { role: "user" as const, content }
    ];

    // Audit log
    try {
      await recordAudit({
        user_id: user.id,
        action: "message.stream",
        resource_type: "chat",
        resource_id: chatId,
        request_id: requestId,
        ip: userIP,
        user_agent: userAgent,
        metadata: { messageCount: aiMessages.length - 1, hasRAG: !!ragContext },
      });
    } catch (auditError) {
      console.warn("Audit logging failed:", auditError);
    }

    // Get OpenRouter config
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

    if (!OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY not configured");
      return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
    }

    // Call OpenRouter for streaming response
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://careiq-eight.vercel.app",
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

    // Stream response
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
                    // Send SSE formatted chunk
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch (e) {
                  // Skip malformed chunks
                }
              }
            }
          }

          // Save assistant response to database
          if (fullResponse.trim()) {
            try {
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
            } catch (saveError) {
              console.error("Failed to save assistant message:", saveError);
            }
          }

          // Send completion signal
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
    
    try {
      await recordAudit({
        action: "message.stream_error",
        request_id: requestId,
        ip: userIP,
        user_agent: userAgent,
        metadata: { error: String(error) },
      });
    } catch (auditError) {
      console.warn("Error audit logging failed:", auditError);
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}