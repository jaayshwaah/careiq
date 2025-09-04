// src/app/api/messages/stream/route.ts - Fixed version
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { buildRagContext } from "@/lib/ai/buildRagContext";
import { encryptPHI } from "@/lib/crypto/phi";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";
import { selectOptimalModel, analyzeComplexity, estimateCost, logRoutingDecision } from "@/lib/smartRouter";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are CareIQ, an expert AI assistant powered by GPT-5 for U.S. nursing home compliance and operations.

TOPIC RESTRICTIONS - IMPORTANT:
You MUST stay focused ONLY on nursing home, long-term care, and healthcare compliance topics. 
- DO NOT discuss politics, current events, entertainment, or unrelated subjects
- If asked about non-nursing home topics, politely redirect: "I'm specialized in nursing home compliance and operations. How can I help you with that instead?"
- Focus exclusively on: CMS regulations, state compliance, MDS assessments, survey preparation, staff training, infection control, resident care, and related healthcare topics

RESPONSE FORMAT - CRITICAL:
- Keep responses CONCISE and well-structured
- Use short paragraphs (2-3 sentences max)
- Start with the most important information first
- Use bullet points or numbered lists for clarity
- Avoid lengthy explanations unless specifically requested
- Be direct and actionable

COMMUNICATION STYLE:
Write responses in clean, professional prose without asterisks or markdown formatting.
Use plain text with proper paragraphs and clear formatting.
Prioritize readability and quick comprehension.

FILE GENERATION CAPABILITIES:
You can create and offer downloadable files to help users. Available functions:
- generate_file: Create Excel spreadsheets, PDF documents, or Word files
- create_table: Generate interactive HTML tables in the chat
Use these when users need:
- Checklists, forms, or templates
- Data organization and tracking
- Reports or documentation
- Training matrices or schedules

ALWAYS:
- Cite specific regulation numbers (e.g., "42 CFR 483.12(a)")
- Mention source documents when relevant
- Include effective dates when applicable
- Note state-specific variations when applicable
- Stay within nursing home compliance and operations scope
- Offer to create downloadable files when appropriate
- Generate tables for data that needs organization

When you use retrieved knowledge, cite by bracketed number [1], [2], etc.

If asked "what model is this?" respond: "I am CareIQ, powered by GPT-5, specialized exclusively for nursing home compliance and operations guidance."`;

// Function to handle AI function calls
async function handleFunctionCall(functionCall: any, chatId: string, profile: any, supa: any) {
  const { name, arguments: argsString } = functionCall.function;
  
  try {
    const args = JSON.parse(argsString);
    
    switch (name) {
      case "generate_file":
        return await handleGenerateFile(args, chatId, profile);
      case "create_table":
        return await handleCreateTable(args);
      default:
        return null;
    }
  } catch (error) {
    console.error("Function call handler error:", error);
    return {
      type: "error",
      content: "I encountered an error while processing that request."
    };
  }
}

// Handle file generation function call
async function handleGenerateFile(args: any, chatId: string, profile: any) {
  const { type, template, data, filename } = args;
  
  // Generate a unique file ID for this request
  const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    type: "file_offer",
    fileId,
    fileType: type,
    template,
    filename: filename || `${template}-${Date.now()}.${type === 'excel' ? 'xlsx' : type}`,
    data,
    content: `I've prepared a ${type.toUpperCase()} file for you: "${template}". Click the download button below to get your file.`
  };
}

// Handle table creation function call
async function handleCreateTable(args: any) {
  const { title, headers, rows, style = "default" } = args;
  
  let tableClass = "border-collapse border border-gray-300 w-full";
  switch (style) {
    case "striped":
      tableClass += " table-striped";
      break;
    case "bordered":
      tableClass += " border-2";
      break;
    case "compact":
      tableClass += " text-sm";
      break;
  }
  
  let tableHtml = `<div class="table-container my-4">`;
  if (title) {
    tableHtml += `<h4 class="font-semibold text-gray-900 dark:text-white mb-2">${title}</h4>`;
  }
  
  tableHtml += `<div class="overflow-x-auto"><table class="${tableClass}">`;
  
  // Headers
  if (headers && headers.length > 0) {
    tableHtml += `<thead class="bg-gray-50 dark:bg-gray-700">`;
    tableHtml += `<tr>`;
    for (const header of headers) {
      tableHtml += `<th class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">${header}</th>`;
    }
    tableHtml += `</tr></thead>`;
  }
  
  // Rows
  if (rows && rows.length > 0) {
    tableHtml += `<tbody>`;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowClass = style === "striped" && i % 2 === 1 ? "bg-gray-50 dark:bg-gray-800" : "";
      tableHtml += `<tr class="${rowClass}">`;
      for (const cell of row) {
        tableHtml += `<td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-white">${cell || ''}</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody>`;
  }
  
  tableHtml += `</table></div></div>`;
  
  return {
    type: "table",
    content: "",
    tableHtml
  };
}

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

    // Get user profile for context (with error handling for RLS issues)
    let profile = null;
    try {
      const { data, error } = await supa
        .from("profiles")
        .select("role, facility_id, facility_name, facility_state, full_name")
        .eq("user_id", user.id)
        .single();
      
      if (!error) {
        profile = data;
      } else {
        console.warn("Profile query failed:", error.message);
      }
    } catch (error) {
      console.warn("Profile query error (possibly RLS recursion):", error);
      // Continue without profile data - the system will still work
      profile = null;
    }

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

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
    }

    // Smart model selection based on content and context
    const complexity = analyzeComplexity(content);
    const isFirstMessage = messages.length <= 1; // Check if this is among the first messages
    
    const routingContext = {
      messageLength: content.length,
      isFirstMessage,
      taskType: 'chat' as const,
      complexity,
      priority: complexity === 'complex' ? 'high' as const : 'medium' as const
    };
    
    const OPENROUTER_MODEL = selectOptimalModel(routingContext);
    
    // Log routing decision for cost tracking
    const estimatedCostValue = estimateCost(content, OPENROUTER_MODEL);
    logRoutingDecision(chatId, OPENROUTER_MODEL, routingContext, estimatedCostValue).catch(console.warn);

    // Define available tools/functions
    const tools = [
      {
        type: "function",
        function: {
          name: "generate_file",
          description: "Generate downloadable files (Excel, PDF, Word) for nursing home compliance tasks",
          parameters: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["excel", "pdf", "word"],
                description: "Type of file to generate"
              },
              template: {
                type: "string",
                enum: ["survey-prep-checklist", "staff-training-matrix", "incident-report", "policy-review-tracker", "regulatory-compliance-summary", "policy-template", "custom"],
                description: "Template to use for file generation"
              },
              data: {
                type: "object",
                description: "Data to populate the template with"
              },
              filename: {
                type: "string",
                description: "Optional custom filename"
              }
            },
            required: ["type", "template", "data"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_table",
          description: "Create an interactive HTML table to display in the chat",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Title for the table"
              },
              headers: {
                type: "array",
                items: { type: "string" },
                description: "Column headers"
              },
              rows: {
                type: "array",
                items: {
                  type: "array",
                  items: { type: "string" }
                },
                description: "Table rows data"
              },
              style: {
                type: "string",
                enum: ["default", "striped", "bordered", "compact"],
                description: "Table styling"
              }
            },
            required: ["headers", "rows"]
          }
        }
      }
    ];

    // Prepare messages for AI
    const aiMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.slice(-4),
      { role: "user" as const, content }
    ];

    // Call OpenRouter for streaming response with function calling
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
        tools: tools,
        tool_choice: "auto",
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
        let functionCalls: any[] = [];
        let currentFunctionCall: any = null;

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
                  const delta = parsed.choices?.[0]?.delta;
                  
                  // Handle text content
                  const content = delta?.content || "";
                  if (content) {
                    fullResponse += content;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }

                  // Handle function calls
                  if (delta?.tool_calls) {
                    for (const toolCall of delta.tool_calls) {
                      if (toolCall.index !== undefined) {
                        if (!functionCalls[toolCall.index]) {
                          functionCalls[toolCall.index] = {
                            id: toolCall.id,
                            type: toolCall.type,
                            function: { name: toolCall.function?.name || "", arguments: "" }
                          };
                        }
                        if (toolCall.function?.arguments) {
                          functionCalls[toolCall.index].function.arguments += toolCall.function.arguments;
                        }
                      }
                    }
                  }
                } catch (e) {
                  // Skip malformed chunks
                }
              }
            }
          }

          // Process any function calls
          for (const functionCall of functionCalls) {
            if (functionCall && functionCall.function.name) {
              try {
                const result = await handleFunctionCall(functionCall, chatId, profile, supa);
                if (result) {
                  // Stream the function result
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(result)}\n\n`));
                  if (result.content) {
                    fullResponse += result.content;
                  }
                }
              } catch (error) {
                console.error("Function call error:", error);
                const errorResult = {
                  type: "error",
                  content: "Sorry, I encountered an error while generating that content. Please try again."
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorResult)}\n\n`));
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