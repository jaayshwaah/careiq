// src/app/api/messages/stream/route.ts - Improved version with comprehensive prompting
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { buildRagContext } from "@/lib/ai/buildRagContext";
import { encryptPHI } from "@/lib/crypto/phi";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";
import { selectOptimalModel, analyzeComplexity, estimateCost, logRoutingDecision } from "@/lib/smartRouter";
import { CAREIQ_SYSTEM_PROMPT } from "@/lib/ai/systemPrompt";

export const runtime = "nodejs";

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

    // Skip profiles table entirely to avoid RLS recursion issues
    // Use basic fallback profile data
    const profile = {
      role: 'user',
      facility_id: null,
      facility_name: 'Healthcare Facility',
      facility_state: null,
      full_name: user?.email?.split('@')[0] || 'User'
    };
    
    console.log('Using fallback profile data to avoid RLS issues');

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
    let systemPrompt = CAREIQ_SYSTEM_PROMPT;
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
    console.log("Making OpenRouter API call with model:", OPENROUTER_MODEL);
    console.log("API Key present:", !!OPENROUTER_API_KEY);
    
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

    console.log("OpenRouter response status:", response.status);
    if (!response.ok) {
      const error = await response.text();
      console.error("OpenRouter error:", response.status, error);
      return NextResponse.json({ 
        error: "AI service unavailable", 
        details: `OpenRouter API error: ${response.status} - ${error}` 
      }, { status: 503 });
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
                    // Forward the OpenAI-format chunk to frontend
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`));
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
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}