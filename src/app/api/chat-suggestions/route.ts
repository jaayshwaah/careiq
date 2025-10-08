// src/app/api/chat-suggestions/route.ts - API for chat suggestions with analytics

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getDiverseSuggestions } from '@/lib/ai/chatSuggestions';

export const runtime = 'nodejs';

/**
 * GET - Fetch suggestions for display
 */
export async function GET(req: NextRequest) {
  try {
    const supa = supabaseAdmin;

    // For GET requests, we don't need strict auth - anyone can view suggestions
    // This allows the page to load suggestions without authentication issues

    // Get ALL active suggestions from the current week's pool
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: suggestions, error } = await supa
      .from('chat_suggestions')
      .select('*')
      .gte('created_at', oneWeekAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching suggestions:', error);
      // Return fallback suggestions
      return NextResponse.json({ 
        suggestions: getDiverseSuggestions(6) 
      });
    }

    // Randomly shuffle ALL suggestions and pick 6 for display
    const allSuggestions = suggestions || [];
    const shuffled = allSuggestions.sort(() => Math.random() - 0.5);
    const diverse = shuffled.slice(0, 6);

    // Update impression counts
    if (diverse.length > 0) {
      const suggestionIds = diverse.map(s => s.id);
      await supa.rpc('increment_suggestion_impressions', {
        suggestion_ids: suggestionIds
      }).catch(err => console.warn('Failed to increment impressions:', err));
    }

    return NextResponse.json({ suggestions: diverse });

  } catch (error: any) {
    console.error('Chat suggestions API error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      suggestions: getDiverseSuggestions(6) // Always return fallback
    }, { status: 500 });
  }
}

/**
 * POST - Track suggestion click
 */
export async function POST(req: NextRequest) {
  try {
    const supa = supabaseAdmin;

    const { suggestion_id } = await req.json();

    if (!suggestion_id) {
      return NextResponse.json({ error: 'suggestion_id required' }, { status: 400 });
    }

    // Increment click count
    const { error } = await supa
      .from('chat_suggestions')
      .update({ 
        clicks: supa.raw('clicks + 1'),
        last_clicked_at: new Date().toISOString()
      })
      .eq('id', suggestion_id);

    if (error) {
      console.error('Error tracking click:', error);
    }

    // Log click for analytics (if we have user context)
    // For now, we'll skip user-specific analytics since we're using admin client
    // await supa
    //   .from('suggestion_analytics')
    //   .insert({
    //     suggestion_id,
    //     user_id: user.id,
    //     action: 'click',
    //     timestamp: new Date().toISOString()
    //   })
    //   .catch(err => console.warn('Failed to log analytics:', err));

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error('Suggestion click tracking error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

