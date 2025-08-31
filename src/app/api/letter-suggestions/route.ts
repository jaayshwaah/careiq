// src/app/api/letter-suggestions/route.ts - API for retrieving letter and email suggestions
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const type = url.searchParams.get('type');
    const urgency = url.searchParams.get('urgency');
    const recipient_type = url.searchParams.get('recipient_type');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
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

    // Build query
    let query = supabase
      .from('knowledge_base')
      .select('*')
      .eq('user_id', user.id)
      .eq('content_type', 'letter_suggestion')
      .order('created_at', { ascending: false });

    // Apply filters
    if (category) {
      query = query.eq('metadata->category', category);
    }

    if (type) {
      query = query.eq('metadata->type', type);
    }

    if (urgency) {
      query = query.eq('metadata->urgency', urgency);
    }

    if (recipient_type) {
      query = query.eq('metadata->recipient_type', recipient_type);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: suggestions, error: fetchError } = await query;

    if (fetchError) {
      console.error('Letter suggestions fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
    }

    // Transform data for response
    const formattedSuggestions = suggestions?.map(suggestion => ({
      id: suggestion.id,
      title: suggestion.data.title,
      content: suggestion.data.content,
      description: suggestion.data.description,
      category: suggestion.data.category,
      type: suggestion.data.type,
      urgency: suggestion.data.urgency,
      recipient_type: suggestion.data.recipient_type,
      tags: suggestion.data.tags || [],
      compliance_areas: suggestion.data.compliance_areas || [],
      created_at: suggestion.created_at
    })) || [];

    return NextResponse.json({
      success: true,
      suggestions: formattedSuggestions,
      total: formattedSuggestions.length
    });

  } catch (error) {
    console.error('Letter suggestions GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch letter suggestions' },
      { status: 500 }
    );
  }
}