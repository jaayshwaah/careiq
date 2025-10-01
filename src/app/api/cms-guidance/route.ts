// CMS Guidance API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export const runtime = "nodejs";
export const revalidate = 1800; // Cache for 30 minutes (semi-static data)

export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.DEFAULT);
    if (rateLimitResponse) return rateLimitResponse;

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'regulations';
    const category = searchParams.get('category');
    const severity = searchParams.get('severity');
    const fTag = searchParams.get('f_tag');

    if (type === 'regulations') {
      let query = supa
        .from('cms_regulations')
        .select('*')
        .eq('is_active', true)
        .order('f_tag');

      if (category) {
        query = query.eq('category', category);
      }
      if (severity) {
        query = query.eq('severity', severity);
      }
      if (fTag) {
        query = query.eq('f_tag', fTag);
      }

      const { data: regulations, error } = await query;

      if (error) {
        console.error('Error fetching CMS regulations:', error);
        return NextResponse.json({ error: "Failed to fetch CMS regulations" }, { status: 500 });
      }

      return NextResponse.json({ regulations: regulations || [] });

    } else if (type === 'updates') {
      const { data: updates, error } = await supa
        .from('compliance_updates')
        .select('*')
        .eq('is_active', true)
        .order('effective_date', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching compliance updates:', error);
        return NextResponse.json({ error: "Failed to fetch compliance updates" }, { status: 500 });
      }

      return NextResponse.json({ updates: updates || [] });

    } else if (type === 'resources') {
      const { data: resources, error } = await supa
        .from('compliance_resources')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching compliance resources:', error);
        return NextResponse.json({ error: "Failed to fetch compliance resources" }, { status: 500 });
      }

      return NextResponse.json({ resources: resources || [] });
    }

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });

  } catch (error: any) {
    console.error('CMS guidance API error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.WRITE);
    if (rateLimitResponse) return rateLimitResponse;

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      type,
      data: requestData
    } = await req.json();

    if (type === 'regulation') {
      const {
        f_tag,
        category,
        title,
        description,
        severity,
        scope,
        last_updated,
        tags = [],
        requirements = [],
        consequences,
        best_practices = [],
        related_regulations = [],
        implementation_steps = [],
        monitoring_requirements = [],
        documentation_requirements = [],
        common_deficiencies = []
      } = requestData;

      if (!f_tag || !category || !title || !description || !severity || !scope) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const { data: regulation, error } = await supa
        .from('cms_regulations')
        .insert({
          f_tag,
          category,
          title,
          description,
          severity,
          scope,
          last_updated,
          tags,
          requirements,
          consequences,
          best_practices,
          related_regulations,
          implementation_steps,
          monitoring_requirements,
          documentation_requirements,
          common_deficiencies
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating CMS regulation:', error);
        return NextResponse.json({ error: "Failed to create CMS regulation" }, { status: 500 });
      }

      return NextResponse.json({ regulation }, { status: 201 });

    } else if (type === 'update') {
      const {
        title,
        description,
        update_type,
        severity,
        effective_date,
        affected_regulations = [],
        summary,
        full_text,
        source_url
      } = requestData;

      if (!title || !description || !update_type || !severity || !effective_date || !summary) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const { data: update, error } = await supa
        .from('compliance_updates')
        .insert({
          title,
          description,
          update_type,
          severity,
          effective_date,
          affected_regulations,
          summary,
          full_text,
          source_url
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating compliance update:', error);
        return NextResponse.json({ error: "Failed to create compliance update" }, { status: 500 });
      }

      return NextResponse.json({ update }, { status: 201 });

    } else if (type === 'resource') {
      const {
        title,
        description,
        resource_type,
        category,
        file_url,
        external_url,
        tags = [],
        is_public = true
      } = requestData;

      if (!title || !description || !resource_type || !category) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const { data: resource, error } = await supa
        .from('compliance_resources')
        .insert({
          title,
          description,
          resource_type,
          category,
          file_url,
          external_url,
          tags,
          is_public,
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating compliance resource:', error);
        return NextResponse.json({ error: "Failed to create compliance resource" }, { status: 500 });
      }

      return NextResponse.json({ resource }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });

  } catch (error: any) {
    console.error('Create CMS guidance error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}