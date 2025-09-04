// src/app/api/chat-shares/route.ts - API for collaborative chat sharing
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chat_id, shared_with_email, permission_level = 'read', expires_at } = body;

    if (!chat_id || !shared_with_email) {
      return NextResponse.json({ error: 'chat_id and shared_with_email are required' }, { status: 400 });
    }

    // Get auth session
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = supabaseServerWithAuth(token);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Verify user owns the chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id, user_id')
      .eq('id', chat_id)
      .eq('user_id', user.id)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found or access denied' }, { status: 404 });
    }

    // Use auth service to find user by email instead of profiles table to avoid RLS recursion
    const { data: userList, error: userError } = await supabase.auth.admin.listUsers();
    const targetUserProfile = userList?.users?.find(u => u.email === shared_with_email);
    
    if (userError || !targetUserProfile) {
      return NextResponse.json({ error: 'User not found with provided email' }, { status: 404 });
    }

    // Check if already shared
    const { data: existingShare } = await supabase
      .from('chat_shares')
      .select('id')
      .eq('chat_id', chat_id)
      .eq('shared_with', targetUserProfile.id)
      .single();

    if (existingShare) {
      // Update existing share
      const { data: updatedShare, error: updateError } = await supabase
        .from('chat_shares')
        .update({
          permission_level,
          expires_at,
          is_active: true,
          shared_at: new Date().toISOString()
        })
        .eq('id', existingShare.id)
        .select(`
          *,
          chat:chats(id, title, created_at)
        `)
        .single();

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update share' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        share: updatedShare
      });
    } else {
      // Create new share
      const { data: newShare, error: shareError } = await supabase
        .from('chat_shares')
        .insert({
          chat_id,
          shared_by: user.id,
          shared_with: targetUserProfile.id,
          permission_level,
          expires_at
        })
        .select(`
          *,
          chat:chats(id, title, created_at)
        `)
        .single();

      if (shareError) {
        console.error('Share creation error:', shareError);
        return NextResponse.json({ error: 'Failed to create share' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        share: newShare
      });
    }

  } catch (error) {
    console.error('Chat share POST error:', error);
    return NextResponse.json(
      { error: 'Failed to share chat' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type'); // 'received' or 'shared'
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get auth session
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = supabaseServerWithAuth(token);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Build query based on type
    let query = supabase
      .from('chat_shares')
      .select(`
        *,
        chat:chats(id, title, created_at)
      `)
      .eq('is_active', true)
      .order('shared_at', { ascending: false });

    if (type === 'received') {
      query = query.eq('shared_with', user.id);
    } else if (type === 'shared') {
      query = query.eq('shared_by', user.id);
    } else {
      // Get both shared and received
      query = query.or(`shared_with.eq.${user.id},shared_by.eq.${user.id}`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: shares, error: fetchError } = await query;

    if (fetchError) {
      console.error('Chat shares fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch shared chats' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      shares: shares || [],
      total: shares?.length || 0
    });

  } catch (error) {
    console.error('Chat shares GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared chats' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, permission_level, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Share ID is required' }, { status: 400 });
    }

    // Get auth session
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = supabaseServerWithAuth(token);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Update share (only if user is the one who shared it)
    const updateData: any = {};
    if (permission_level) updateData.permission_level = permission_level;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedShare, error: updateError } = await supabase
      .from('chat_shares')
      .update(updateData)
      .eq('id', id)
      .eq('shared_by', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Share update error:', updateError);
      return NextResponse.json({ error: 'Failed to update share' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      share: updatedShare
    });

  } catch (error) {
    console.error('Chat share PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update share' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Share ID is required' }, { status: 400 });
    }

    // Get auth session
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = supabaseServerWithAuth(token);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Delete share (only if user is the one who shared it)
    const { error: deleteError } = await supabase
      .from('chat_shares')
      .delete()
      .eq('id', id)
      .eq('shared_by', user.id);

    if (deleteError) {
      console.error('Share delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete share' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Chat share DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete share' },
      { status: 500 }
    );
  }
}