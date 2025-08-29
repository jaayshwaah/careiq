// src/app/api/templates/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

/**
 * GET /api/templates - Get user's templates and public templates
 * Query params: ?category=string, ?public_only=true
 */
export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.API);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const category = url.searchParams.get('category');
    const publicOnly = url.searchParams.get('public_only') === 'true';

    let query = supa
      .from("chat_templates")
      .select(`
        id,
        title,
        content,
        description,
        category,
        tags,
        is_public,
        usage_count,
        created_at,
        user_id,
        profiles!chat_templates_user_id_fkey(full_name)
      `)
      .order("usage_count", { ascending: false });

    if (publicOnly) {
      query = query.eq("is_public", true);
    } else {
      // Get user's own templates AND public templates
      query = query.or(`user_id.eq.${user.id},is_public.eq.true`);
    }

    if (category) {
      query = query.eq("category", category);
    }

    const { data: templates, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, templates: templates || [] });

  } catch (error) {
    console.error("Get templates error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/templates - Create a new template
 * Body: { title, content, description?, category?, tags?, is_public? }
 */
export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.API);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { 
      title,
      content,
      description = null,
      category = 'general',
      tags = [],
      is_public = false
    } = await req.json();
    
    if (!title || !content) {
      return NextResponse.json({ 
        error: "title and content are required" 
      }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: template, error } = await supa
      .from("chat_templates")
      .insert({
        user_id: user.id,
        title: title.slice(0, 200),
        content,
        description,
        category,
        tags,
        is_public
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, template });

  } catch (error) {
    console.error("Create template error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/templates?id=template_id - Update a template
 */
export async function PUT(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const templateId = url.searchParams.get('id');
    
    if (!templateId) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

    const { 
      title,
      content,
      description,
      category,
      tags,
      is_public
    } = await req.json();

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates: any = {};
    if (title !== undefined) updates.title = title.slice(0, 200);
    if (content !== undefined) updates.content = content;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (tags !== undefined) updates.tags = tags;
    if (is_public !== undefined) updates.is_public = is_public;

    const { data: template, error } = await supa
      .from("chat_templates")
      .update(updates)
      .eq("id", templateId)
      .eq("user_id", user.id) // Only allow updating own templates
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, template });

  } catch (error) {
    console.error("Update template error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/templates?id=template_id - Delete a template
 */
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const templateId = url.searchParams.get('id');
    
    if (!templateId) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supa
      .from("chat_templates")
      .delete()
      .eq("id", templateId)
      .eq("user_id", user.id); // Only allow deleting own templates

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Delete template error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/templates/use?id=template_id - Increment usage count for template
 */
export async function PATCH(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const templateId = url.searchParams.get('id');
    const action = url.searchParams.get('action');
    
    if (!templateId || action !== 'use') {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Increment usage count
    const { error } = await supa.rpc('increment_template_usage', { 
      template_id: templateId 
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Update template usage error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}