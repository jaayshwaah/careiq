// System Health Monitoring API
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

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {} as any,
      metrics: {} as any
    };

    // Test Database Connection
    try {
      const startDb = Date.now();
      const { data, error } = await supa.from('profiles').select('count').limit(1).single();
      const dbLatency = Date.now() - startDb;
      
      health.services.database = {
        status: error ? 'unhealthy' : 'healthy',
        latency_ms: dbLatency,
        message: error ? error.message : 'Connected'
      };
    } catch (error: any) {
      health.services.database = {
        status: 'unhealthy',
        error: error.message
      };
      health.status = 'degraded';
    }

    // Test Supabase Storage
    try {
      const { data: buckets, error } = await supa.storage.listBuckets();
      health.services.storage = {
        status: error ? 'unhealthy' : 'healthy',
        buckets_count: buckets?.length || 0
      };
    } catch (error: any) {
      health.services.storage = {
        status: 'unhealthy',
        error: error.message
      };
    }

    // Test OpenRouter API
    try {
      if (process.env.OPENROUTER_API_KEY) {
        const startAi = Date.now();
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
          }
        });
        const aiLatency = Date.now() - startAi;
        
        health.services.ai_api = {
          status: response.ok ? 'healthy' : 'unhealthy',
          latency_ms: aiLatency,
          message: response.ok ? 'Connected' : `HTTP ${response.status}`
        };
      } else {
        health.services.ai_api = {
          status: 'not_configured',
          message: 'OpenRouter API key not set'
        };
      }
    } catch (error: any) {
      health.services.ai_api = {
        status: 'unhealthy',
        error: error.message
      };
    }

    // Get Database Metrics
    try {
      // Count recent errors
      const { count: errorCount } = await supa
        .from('error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Count critical errors
      const { count: criticalCount } = await supa
        .from('error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .eq('resolved', false)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Count active users (24h)
      const { count: activeUsers } = await supa
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Count total facilities
      const { count: facilitiesCount } = await supa
        .from('facilities')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      health.metrics = {
        unresolved_errors_24h: errorCount || 0,
        critical_errors_24h: criticalCount || 0,
        active_users_24h: activeUsers || 0,
        active_facilities: facilitiesCount || 0
      };

      if (criticalCount && criticalCount > 0) {
        health.status = 'degraded';
      }
    } catch (error: any) {
      console.error('Metrics error:', error);
    }

    // Check for system maintenance mode
    try {
      const { data: maintenanceMode } = await supa
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();

      if (maintenanceMode?.value === true || maintenanceMode?.value === 'true') {
        health.status = 'maintenance';
      }
    } catch (error) {
      // Ignore if table doesn't exist yet
    }

    return NextResponse.json(health);
  } catch (error: any) {
    console.error('System health check error:', error);
    return NextResponse.json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}


