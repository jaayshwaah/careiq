// Analytics & Reporting API
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerWithAuth } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin - use user_id, not id
    const { data: profile } = await supa
      .from('profiles')
      .select('is_admin, role, email')
      .eq('user_id', user.id)
      .single();

    const isAdmin = profile?.is_admin || 
                    String(profile?.role || '').toLowerCase().includes('administrator') ||
                    profile?.email?.endsWith('@careiq.com') ||
                    profile?.email === 'jking4600@gmail.com';
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30'; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // User Analytics
    const { count: totalUsers } = await supa
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: activeUsers } = await supa
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', startDate.toISOString());

    const { count: newUsers } = await supa
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // Chat Analytics
    const { count: totalChats } = await supa
      .from('chats')
      .select('*', { count: 'exact', head: true });

    const { count: recentChats } = await supa
      .from('chats')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    const { count: totalMessages } = await supa
      .from('messages')
      .select('*', { count: 'exact', head: true });

    // Facility Analytics
    const { count: totalFacilities } = await supa
      .from('facilities')
      .select('*', { count: 'exact', head: true });

    const { count: activeFacilities } = await supa
      .from('facilities')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { data: facilitiesByTier } = await supa
      .from('facilities')
      .select('subscription_tier')
      .eq('status', 'active');

    const tierDistribution = facilitiesByTier?.reduce((acc: any, f: any) => {
      acc[f.subscription_tier] = (acc[f.subscription_tier] || 0) + 1;
      return acc;
    }, {});

    // Revenue Analytics
    const { data: facilities } = await supa
      .from('facilities')
      .select('monthly_cost, subscription_status')
      .eq('status', 'active');

    const mrr = facilities?.reduce((sum: number, f: any) => 
      f.subscription_status === 'active' ? sum + (f.monthly_cost || 0) : sum, 0
    ) || 0;

    const arr = mrr * 12;

    // Error Analytics
    const { count: totalErrors } = await supa
      .from('error_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    const { count: criticalErrors } = await supa
      .from('error_logs')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'critical')
      .gte('created_at', startDate.toISOString());

    // Feature Usage (from suggestion clicks)
    const { data: featureUsage } = await supa
      .from('chat_suggestions')
      .select('category, clicks')
      .order('clicks', { ascending: false })
      .limit(10);

    // Daily active users trend
    const dailyActiveUsers = [];
    for (let i = parseInt(period) - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0)).toISOString();
      const dayEnd = new Date(date.setHours(23, 59, 59, 999)).toISOString();

      const { count } = await supa
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', dayStart)
        .lte('updated_at', dayEnd);

      dailyActiveUsers.push({
        date: dayStart.split('T')[0],
        count: count || 0
      });
    }

    const analytics = {
      users: {
        total: totalUsers || 0,
        active: activeUsers || 0,
        new: newUsers || 0,
        daily_trend: dailyActiveUsers
      },
      chats: {
        total: totalChats || 0,
        recent: recentChats || 0,
        messages: totalMessages || 0,
        avg_per_chat: totalChats ? Math.round((totalMessages || 0) / totalChats) : 0
      },
      facilities: {
        total: totalFacilities || 0,
        active: activeFacilities || 0,
        by_tier: tierDistribution || {}
      },
      revenue: {
        mrr: Math.round(mrr),
        arr: Math.round(arr),
        arpu: activeFacilities ? Math.round(mrr / activeFacilities) : 0
      },
      errors: {
        total: totalErrors || 0,
        critical: criticalErrors || 0
      },
      feature_usage: featureUsage || []
    };

    return NextResponse.json(analytics);
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


