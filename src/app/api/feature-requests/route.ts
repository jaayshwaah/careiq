// Feature Requests API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export const runtime = "nodejs";

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
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';

    let query = supa
      .from('feature_requests')
      .select(`
        *,
        submitter:profiles!feature_requests_submitted_by_fkey(full_name, email),
        votes:feature_request_votes(id, user_id),
        vote_count:feature_request_votes(count)
      `);

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    const { data: featureRequests, error } = await query.limit(100);

    if (error) {
      console.error('Error fetching feature requests:', error);
      return NextResponse.json({ error: "Failed to fetch feature requests" }, { status: 500 });
    }

    // Add user's vote status to each request
    const requestsWithUserVotes = await Promise.all(
      (featureRequests || []).map(async (request) => {
        const { data: userVote } = await supa
          .from('feature_request_votes')
          .select('id')
          .eq('request_id', request.id)
          .eq('user_id', user.id)
          .single();

        return {
          ...request,
          user_has_voted: !!userVote,
          vote_count: request.vote_count?.[0]?.count || 0
        };
      })
    );

    return NextResponse.json({ 
      feature_requests: requestsWithUserVotes,
      total: requestsWithUserVotes.length 
    });

  } catch (error: any) {
    console.error('Feature requests API error:', error);
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
      title,
      description,
      category = 'enhancement',
      priority = 'medium',
      business_justification
    } = await req.json();

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    // Check for similar requests using AI (simplified version)
    const { data: existingRequests } = await supa
      .from('feature_requests')
      .select('id, title, description, vote_count')
      .ilike('title', `%${title}%`);

    let similarRequests = [];
    if (existingRequests && existingRequests.length > 0) {
      // Simple similarity check - in production, you'd use vector embeddings
      similarRequests = existingRequests.filter(req => 
        req.title.toLowerCase().includes(title.toLowerCase()) ||
        title.toLowerCase().includes(req.title.toLowerCase())
      );
    }

    const { data: featureRequest, error } = await supa
      .from('feature_requests')
      .insert({
        title,
        description,
        category,
        priority,
        business_justification,
        submitted_by: user.id,
        status: 'submitted',
        similar_requests: similarRequests.map(r => r.id)
      })
      .select(`
        *,
        submitter:profiles!feature_requests_submitted_by_fkey(full_name, email)
      `)
      .single();

    if (error) {
      console.error('Error creating feature request:', error);
      return NextResponse.json({ error: "Failed to create feature request" }, { status: 500 });
    }

    // Auto-vote for own request
    await supa
      .from('feature_request_votes')
      .insert({
        request_id: featureRequest.id,
        user_id: user.id
      });

    return NextResponse.json({ 
      feature_request: {
        ...featureRequest,
        user_has_voted: true,
        vote_count: 1,
        similar_requests: similarRequests
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create feature request error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
