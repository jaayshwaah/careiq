// src/app/api/chats/share/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

/**
 * GET /api/chats/share?chat_id=uuid - Get sharing info for a chat
 */
export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.API);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const url = new URL(req.url);
    const chatId = url.searchParams.get('chat_id');
    
    if (!chatId) {
      return NextResponse.json({ error: "chat_id is required" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user owns the chat or has access to it
    const { data: chat, error: chatError } = await supa
      .from("chats")
      .select("id, user_id, title")
      .eq("id", chatId)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Check if user owns the chat or has shared access
    const { data: shareCheck, error: shareError } = await supa
      .from("chat_shares")
      .select("permission_level")
      .eq("chat_id", chatId)
      .eq("shared_with", user.id)
      .eq("is_active", true)
      .single();

    if (chat.user_id !== user.id && !shareCheck) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get all shares for this chat (only if user owns it)
    if (chat.user_id === user.id) {
      const { data: shares, error: sharesError } = await supa
        .from("chat_shares")
        .select(`
          id,
          shared_with,
          permission_level,
          shared_at,
          expires_at,
          is_active,
          profiles!chat_shares_shared_with_fkey(full_name, email)
        `)
        .eq("chat_id", chatId)
        .order("shared_at", { ascending: false });

      if (sharesError) {
        return NextResponse.json({ error: sharesError.message }, { status: 500 });
      }

      return NextResponse.json({ 
        ok: true, 
        chat,
        shares: shares || [],
        isOwner: true
      });
    } else {
      return NextResponse.json({ 
        ok: true, 
        chat,
        shares: [],
        isOwner: false,
        myPermission: shareCheck.permission_level
      });
    }

  } catch (error) {
    console.error("Get chat shares error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/chats/share - Share a chat with team members
 * Body: { chat_id, shared_with_email, permission_level, expires_at? }
 */
export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.API);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { 
      chat_id, 
      shared_with_email, 
      permission_level = 'read',
      expires_at = null 
    } = await req.json();
    
    if (!chat_id || !shared_with_email) {
      return NextResponse.json({ 
        error: "chat_id and shared_with_email are required" 
      }, { status: 400 });
    }

    if (!['read', 'comment', 'edit'].includes(permission_level)) {
      return NextResponse.json({ 
        error: "Invalid permission level" 
      }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user owns the chat
    const { data: chat, error: chatError } = await supa
      .from("chats")
      .select("id, user_id, title")
      .eq("id", chat_id)
      .eq("user_id", user.id)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ 
        error: "Chat not found or you don't have permission to share it" 
      }, { status: 404 });
    }

    // Find user to share with
    const { data: targetUser, error: targetError } = await supa
      .from("profiles")
      .select("user_id, full_name, email")
      .eq("email", shared_with_email)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ 
        error: "User not found with that email address" 
      }, { status: 404 });
    }

    // Don't allow sharing with self
    if (targetUser.user_id === user.id) {
      return NextResponse.json({ 
        error: "Cannot share chat with yourself" 
      }, { status: 400 });
    }

    // Create or update the share
    const { data: share, error } = await supa
      .from("chat_shares")
      .upsert({
        chat_id,
        shared_by: user.id,
        shared_with: targetUser.user_id,
        permission_level,
        expires_at,
        is_active: true,
        shared_at: new Date().toISOString()
      }, {
        onConflict: 'chat_id,shared_with'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      share: {
        ...share,
        shared_with_name: targetUser.full_name,
        shared_with_email: targetUser.email
      }
    });

  } catch (error) {
    console.error("Share chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/chats/share?share_id=uuid - Remove a chat share
 */
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const shareId = url.searchParams.get('share_id');
    
    if (!shareId) {
      return NextResponse.json({ error: "share_id is required" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update the share to inactive (soft delete)
    const { error } = await supa
      .from("chat_shares")
      .update({ is_active: false })
      .eq("id", shareId)
      .eq("shared_by", user.id); // Only owner can remove shares

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Delete share error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}