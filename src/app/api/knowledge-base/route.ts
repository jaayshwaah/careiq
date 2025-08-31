// src/app/api/knowledge-base/route.ts - CRUD operations for knowledge base items
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      title, 
      content, 
      category, 
      tags, 
      confidence_score,
      source_type,
      metadata,
      user_id
    } = body;

    if (!title?.trim() || !content?.trim() || !category) {
      return NextResponse.json({ error: 'Title, content, and category are required' }, { status: 400 });
    }

    // Get auth session
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = getServerSupabase(token);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Save to knowledge_base table using the universal storage pattern
    const knowledgeData = {
      user_id: user.id,
      content_type: 'knowledge_item',
      title,
      data: {
        content,
        category,
        tags: Array.isArray(tags) ? tags : [],
        confidence_score: confidence_score || 0.7,
        source_type: source_type || 'manual',
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      },
      tags: Array.isArray(tags) ? tags : [],
      metadata: {
        ...(metadata || {}),
        category,
        confidence_score: confidence_score || 0.7,
        source_type: source_type || 'manual',
      }
    };

    const { data: savedItem, error: saveError } = await supabase
      .from('knowledge_base')
      .insert(knowledgeData)
      .select()
      .single();

    if (saveError) {
      console.error('Knowledge base save error:', saveError);
      return NextResponse.json({ error: 'Failed to save knowledge item' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      knowledge_item: {
        id: savedItem.id,
        title: savedItem.title,
        content: savedItem.data.content,
        category: savedItem.data.category,
        tags: savedItem.data.tags,
        confidence_score: savedItem.data.confidence_score,
        source_type: savedItem.data.source_type,
        metadata: savedItem.data.metadata,
        created_at: savedItem.created_at,
      }
    });

  } catch (error) {
    console.error('Knowledge base POST error:', error);
    return NextResponse.json(
      { error: 'Failed to save knowledge item' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const tags = url.searchParams.get('tags');
    const search = url.searchParams.get('search');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get auth session
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = getServerSupabase(token);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Build query
    let query = supabase
      .from('knowledge_base')
      .select('*')
      .eq('user_id', user.id)
      .eq('content_type', 'knowledge_item')
      .order('created_at', { ascending: false });

    // Apply filters
    if (category) {
      query = query.eq('metadata->category', category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,data->>content.ilike.%${search}%`);
    }

    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      query = query.overlaps('tags', tagArray);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: items, error: fetchError } = await query;

    if (fetchError) {
      console.error('Knowledge base fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch knowledge items' }, { status: 500 });
    }

    // Transform data for response
    const knowledgeItems = items.map(item => ({
      id: item.id,
      title: item.title,
      content: item.data.content,
      category: item.data.category,
      tags: item.data.tags,
      confidence_score: item.data.confidence_score,
      source_type: item.data.source_type,
      metadata: item.data.metadata,
      created_at: item.created_at,
    }));

    return NextResponse.json({
      success: true,
      knowledge_items: knowledgeItems,
      total: knowledgeItems.length
    });

  } catch (error) {
    console.error('Knowledge base GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge items' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID parameter is required' }, { status: 400 });
    }

    // Get auth session
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = getServerSupabase(token);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Delete the knowledge item
    const { error: deleteError } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('content_type', 'knowledge_item');

    if (deleteError) {
      console.error('Knowledge base delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete knowledge item' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Knowledge base DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete knowledge item' },
      { status: 500 }
    );
  }
}