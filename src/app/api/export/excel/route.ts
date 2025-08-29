// src/app/api/export/excel/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { decryptPHI } from "@/lib/crypto/phi";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

/**
 * POST /api/export/excel - Export chat to Excel format
 * Body: { chat_id, include_metadata?, format? }
 */
export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.PDF_EXPORT);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { 
      chat_id, 
      include_metadata = true, 
      format = 'detailed' // 'detailed' | 'simple' | 'analytics'
    } = await req.json();
    
    if (!chat_id) {
      return NextResponse.json({ error: "chat_id is required" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get chat and verify access
    const { data: chat, error: chatError } = await supa
      .from("chats")
      .select("id, title, created_at, updated_at")
      .eq("id", chat_id)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: "Chat not found or access denied" }, { status: 404 });
    }

    // Get messages
    const { data: messages, error: messagesError } = await supa
      .from("messages")
      .select("id, role, content_enc, content_iv, content_tag, created_at")
      .eq("chat_id", chat_id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 500 });
    }

    // Decrypt messages
    const decryptedMessages = [];
    for (const message of messages || []) {
      try {
        const decrypted = decryptPHI({
          ciphertext: Buffer.from(message.content_enc, "base64"),
          iv: Buffer.from(message.content_iv, "base64"),
          tag: Buffer.from(message.content_tag, "base64"),
        });

        decryptedMessages.push({
          id: message.id,
          role: message.role,
          content: decrypted,
          created_at: message.created_at,
          word_count: decrypted.split(' ').length,
          char_count: decrypted.length
        });
      } catch (error) {
        console.warn("Failed to decrypt message for export:", error);
        decryptedMessages.push({
          id: message.id,
          role: message.role,
          content: "[Unable to decrypt message]",
          created_at: message.created_at,
          word_count: 0,
          char_count: 0
        });
      }
    }

    // Generate Excel data based on format
    let excelData;
    
    if (format === 'analytics') {
      excelData = generateAnalyticsExcel(chat, decryptedMessages, include_metadata);
    } else if (format === 'simple') {
      excelData = generateSimpleExcel(chat, decryptedMessages);
    } else {
      excelData = generateDetailedExcel(chat, decryptedMessages, include_metadata);
    }

    // Create Excel workbook using a simple CSV-like structure for now
    // For a production app, you'd want to use a library like 'exceljs'
    const csvContent = generateCSV(excelData);

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="careiq-chat-${chat.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'export'}-${Date.now()}.csv"`,
        "Cache-Control": "no-store",
      },
    });

  } catch (error) {
    console.error("Excel export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function generateDetailedExcel(chat: any, messages: any[], includeMetadata: boolean) {
  const data = [
    // Header information
    ['Chat Export Report'],
    ['Generated:', new Date().toLocaleString()],
    ['Chat Title:', chat.title || 'Untitled'],
    ['Chat ID:', chat.id],
    ['Created:', new Date(chat.created_at).toLocaleString()],
    ['Last Updated:', new Date(chat.updated_at).toLocaleString()],
    ['Total Messages:', messages.length],
    [],
    // Messages header
    ['Message ID', 'Role', 'Content', 'Timestamp', 'Word Count', 'Character Count']
  ];

  // Add messages
  messages.forEach(msg => {
    data.push([
      msg.id,
      msg.role,
      msg.content.replace(/"/g, '""'), // Escape quotes for CSV
      new Date(msg.created_at).toLocaleString(),
      msg.word_count,
      msg.char_count
    ]);
  });

  if (includeMetadata) {
    data.push([]);
    data.push(['Analytics']);
    data.push(['Total User Messages:', messages.filter(m => m.role === 'user').length]);
    data.push(['Total Assistant Messages:', messages.filter(m => m.role === 'assistant').length]);
    data.push(['Average Words per User Message:', 
      Math.round(messages.filter(m => m.role === 'user').reduce((sum, m) => sum + m.word_count, 0) / 
      Math.max(1, messages.filter(m => m.role === 'user').length))
    ]);
    data.push(['Average Words per Assistant Message:', 
      Math.round(messages.filter(m => m.role === 'assistant').reduce((sum, m) => sum + m.word_count, 0) / 
      Math.max(1, messages.filter(m => m.role === 'assistant').length))
    ]);
  }

  return data;
}

function generateSimpleExcel(chat: any, messages: any[]) {
  const data = [
    ['Role', 'Message', 'Timestamp']
  ];

  messages.forEach(msg => {
    data.push([
      msg.role === 'user' ? 'You' : 'CareIQ',
      msg.content.replace(/"/g, '""'),
      new Date(msg.created_at).toLocaleString()
    ]);
  });

  return data;
}

function generateAnalyticsExcel(chat: any, messages: any[], includeMetadata: boolean) {
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');

  // Calculate time between messages
  const responseTimesMs = [];
  for (let i = 0; i < messages.length - 1; i++) {
    if (messages[i].role === 'user' && messages[i + 1].role === 'assistant') {
      const userTime = new Date(messages[i].created_at).getTime();
      const assistantTime = new Date(messages[i + 1].created_at).getTime();
      responseTimesMs.push(assistantTime - userTime);
    }
  }

  const avgResponseTime = responseTimesMs.length > 0 ? 
    responseTimesMs.reduce((sum, time) => sum + time, 0) / responseTimesMs.length / 1000 : 0;

  const data = [
    ['Chat Analytics Report'],
    ['Generated:', new Date().toLocaleString()],
    ['Chat Title:', chat.title || 'Untitled'],
    [],
    ['Metric', 'Value'],
    ['Total Messages', messages.length],
    ['User Messages', userMessages.length],
    ['Assistant Messages', assistantMessages.length],
    ['Average Response Time (seconds)', Math.round(avgResponseTime * 100) / 100],
    ['Total Words (User)', userMessages.reduce((sum, m) => sum + m.word_count, 0)],
    ['Total Words (Assistant)', assistantMessages.reduce((sum, m) => sum + m.word_count, 0)],
    ['Average Words per User Message', userMessages.length > 0 ? Math.round(userMessages.reduce((sum, m) => sum + m.word_count, 0) / userMessages.length) : 0],
    ['Average Words per Assistant Message', assistantMessages.length > 0 ? Math.round(assistantMessages.reduce((sum, m) => sum + m.word_count, 0) / assistantMessages.length) : 0],
    ['Chat Duration (hours)', Math.round((new Date(chat.updated_at).getTime() - new Date(chat.created_at).getTime()) / (1000 * 60 * 60) * 100) / 100],
    [],
    ['Hourly Breakdown'],
    ['Hour', 'Messages']
  ];

  // Add hourly breakdown
  const hourlyCount: { [key: number]: number } = {};
  messages.forEach(msg => {
    const hour = new Date(msg.created_at).getHours();
    hourlyCount[hour] = (hourlyCount[hour] || 0) + 1;
  });

  for (let i = 0; i < 24; i++) {
    data.push([`${i}:00`, hourlyCount[i] || 0]);
  }

  return data;
}

function generateCSV(data: any[][]): string {
  return data.map(row => 
    row.map(cell => 
      typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
        ? `"${cell.replace(/"/g, '""')}"` 
        : cell
    ).join(',')
  ).join('\n');
}