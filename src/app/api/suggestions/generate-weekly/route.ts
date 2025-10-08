// src/app/api/suggestions/generate-weekly/route.ts
// API endpoint to generate 100 new weekly suggestions and replace old ones
// Call this via cron job weekly

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { generateAndReplaceWeeklySuggestions } from '@/lib/ai/chatSuggestions';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for generation

/**
 * POST - Generate and replace weekly suggestions
 * Requires admin authentication or cron secret
 */
export async function POST(req: NextRequest) {
  try {
    // Check for cron secret (for automated weekly runs)
    const cronSecret = req.headers.get('x-cron-secret');
    const validCronSecret = process.env.CRON_SECRET || 'your-secret-here';
    
    if (cronSecret === validCronSecret) {
      // Authorized via cron secret - use admin client
      await generateAndReplaceWeeklySuggestions(supabaseAdmin);
      
      return NextResponse.json({ 
        ok: true, 
        message: 'Successfully generated and replaced 100 weekly suggestions',
        timestamp: new Date().toISOString()
      });
    }
    
    // Otherwise check for admin user
    const authHeader = req.headers.get('authorization') || undefined;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    // For manual triggers by admin users, we still use admin client but verify the user
    if (accessToken) {
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
      if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Check if user is admin
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role, is_admin')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.is_admin || 
                     profile?.role === 'administrator' || 
                     String(profile?.role || '').includes('administrator');

      if (!isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate and replace suggestions
    await generateAndReplaceWeeklySuggestions(supabaseAdmin);

    return NextResponse.json({ 
      ok: true, 
      message: 'Successfully generated and replaced 100 weekly suggestions',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Weekly suggestion generation error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

