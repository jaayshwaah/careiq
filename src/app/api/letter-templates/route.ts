// src/app/api/letter-templates/route.ts - API for managing letter and email templates
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      title, 
      content, 
      description,
      category, 
      type = 'email',
      urgency = 'medium',
      recipient_type,
      tags = [],
      compliance_areas = []
    } = body;

    if (!title?.trim() || !content?.trim() || !category || !recipient_type) {
      return NextResponse.json({ error: 'Title, content, category, and recipient_type are required' }, { status: 400 });
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

    // Save template to knowledge_base table
    const templateData = {
      user_id: user.id,
      content_type: 'letter_template',
      title,
      data: {
        title,
        content,
        description: description || '',
        category,
        type,
        urgency,
        recipient_type,
        tags: Array.isArray(tags) ? tags : [],
        compliance_areas: Array.isArray(compliance_areas) ? compliance_areas : [],
        created_at: new Date().toISOString(),
      },
      tags: Array.isArray(tags) ? tags : [],
      metadata: {
        category,
        type,
        urgency,
        recipient_type,
      }
    };

    const { data: savedTemplate, error: saveError } = await supabase
      .from('knowledge_base')
      .insert(templateData)
      .select()
      .single();

    if (saveError) {
      console.error('Template save error:', saveError);
      return NextResponse.json({ error: 'Failed to save template' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      template: {
        id: savedTemplate.id,
        title: savedTemplate.data.title,
        content: savedTemplate.data.content,
        description: savedTemplate.data.description,
        category: savedTemplate.data.category,
        type: savedTemplate.data.type,
        urgency: savedTemplate.data.urgency,
        recipient_type: savedTemplate.data.recipient_type,
        tags: savedTemplate.data.tags,
        compliance_areas: savedTemplate.data.compliance_areas,
        created_at: savedTemplate.created_at,
      }
    });

  } catch (error) {
    console.error('Letter template POST error:', error);
    return NextResponse.json(
      { error: 'Failed to save template' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const type = url.searchParams.get('type');
    const urgency = url.searchParams.get('urgency');
    const recipient_type = url.searchParams.get('recipient_type');
    const search = url.searchParams.get('search');
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
      .eq('content_type', 'letter_template')
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

    if (search) {
      query = query.or(`title.ilike.%${search}%,data->>content.ilike.%${search}%,data->>description.ilike.%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: templates, error: fetchError } = await query;

    if (fetchError) {
      console.error('Letter templates fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    // Transform data for response
    const formattedTemplates = templates?.map(template => ({
      id: template.id,
      title: template.data.title,
      content: template.data.content,
      description: template.data.description,
      category: template.data.category,
      type: template.data.type,
      urgency: template.data.urgency,
      recipient_type: template.data.recipient_type,
      tags: template.data.tags || [],
      compliance_areas: template.data.compliance_areas || [],
      created_at: template.created_at
    })) || [];

    return NextResponse.json({
      success: true,
      templates: formattedTemplates,
      total: formattedTemplates.length
    });

  } catch (error) {
    console.error('Letter templates GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
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

    // Delete the template
    const { error: deleteError } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('content_type', 'letter_template');

    if (deleteError) {
      console.error('Template delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Letter template DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}