// src/app/api/chats/search/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { decryptPHI } from "@/lib/crypto/phi";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

/**
 * GET /api/chats/search?q=query
 * Search through user's chat history
 */
export async function GET(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.SEARCH);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const url = new URL(req.url);
    const query = url.searchParams.get('q');
    
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
    }

    // Get user authentication
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get chats and messages for the user (RLS enforced)
    const { data: chats, error: chatsError } = await supa
      .from("chats")
      .select(`
        id, 
        title, 
        created_at, 
        updated_at,
        messages!inner(
          id,
          role,
          content_enc,
          content_iv, 
          content_tag,
          created_at
        )
      `)
      .order("updated_at", { ascending: false });

    if (chatsError) {
      return NextResponse.json({ error: chatsError.message }, { status: 500 });
    }

    // Search through decrypted messages
    const results = [];
    const searchTermLower = query.toLowerCase();

    for (const chat of chats || []) {
      let chatMatches = [];
      let titleMatch = false;

      // Check if title matches
      if (chat.title?.toLowerCase().includes(searchTermLower)) {
        titleMatch = true;
      }

      // Search through messages
      for (const message of chat.messages || []) {
        try {
          const decrypted = decryptPHI({
            ciphertext: Buffer.from(message.content_enc, "base64"),
            iv: Buffer.from(message.content_iv, "base64"),
            tag: Buffer.from(message.content_tag, "base64"),
          });

          if (decrypted.toLowerCase().includes(searchTermLower)) {
            chatMatches.push({
              id: message.id,
              role: message.role,
              content: decrypted.length > 200 ? decrypted.substring(0, 200) + "..." : decrypted,
              created_at: message.created_at,
              // Highlight the match context
              snippet: getSnippet(decrypted, searchTermLower)
            });
          }
        } catch (error) {
          console.warn("Failed to decrypt message for search:", error);
        }
      }

      // If chat has matches or title matches, include it
      if (chatMatches.length > 0 || titleMatch) {
        results.push({
          chatId: chat.id,
          title: chat.title,
          created_at: chat.created_at,
          updated_at: chat.updated_at,
          titleMatch,
          messageMatches: chatMatches.slice(0, 3), // Limit to 3 matches per chat
          totalMatches: chatMatches.length
        });
      }
    }

    return NextResponse.json({ 
      ok: true, 
      results: results.slice(0, 20), // Limit to 20 chat results
      totalResults: results.length,
      query 
    });

  } catch (error) {
    console.error("Chat search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper function to extract snippet around the match
function getSnippet(text: string, searchTerm: string, maxLength: number = 150): string {
  const index = text.toLowerCase().indexOf(searchTerm.toLowerCase());
  if (index === -1) return text.substring(0, maxLength);

  const start = Math.max(0, index - Math.floor(maxLength / 2));
  const end = Math.min(text.length, start + maxLength);
  
  let snippet = text.substring(start, end);
  
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  
  return snippet;
}