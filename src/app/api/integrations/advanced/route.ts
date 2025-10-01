// Advanced Integration Management API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface IntegrationConfig {
  id: string;
  name: string;
  type: 'ehr' | 'calendar' | 'supplier' | 'cms' | 'analytics';
  status: 'active' | 'inactive' | 'error' | 'pending';
  lastSync?: string;
  healthScore: number;
  features: string[];
  configuration: Record<string, any>;
}

interface IntegrationMetrics {
  totalIntegrations: number;
  activeIntegrations: number;
  errorRate: number;
  avgSyncTime: number;
  lastWeekSyncs: number;
}

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

    // Get user's facility
    const { data: profile } = await supa
      .from("profiles")
      .select("facility_id, role")
      .eq("user_id", user.id)
      .single();

    if (!profile?.facility_id) {
      return NextResponse.json({ error: "No facility associated" }, { status: 400 });
    }

    // Get all integrations for the facility
    const [ehrIntegrations, calendarIntegrations, supplierIntegrations] = await Promise.all([
      supa.from("ehr_integrations").select("*").eq("facility_id", profile.facility_id),
      supa.from("calendar_integrations").select("*").eq("user_id", user.id),
      supa.from("suppliers").select("*").eq("facility_id", profile.facility_id)
    ]);

    // Calculate metrics
    const allIntegrations = [
      ...(ehrIntegrations.data || []).map(i => ({ ...i, type: 'ehr' })),
      ...(calendarIntegrations.data || []).map(i => ({ ...i, type: 'calendar' })),
      ...(supplierIntegrations.data || []).map(i => ({ ...i, type: 'supplier' }))
    ];

    const metrics: IntegrationMetrics = {
      totalIntegrations: allIntegrations.length,
      activeIntegrations: allIntegrations.filter(i => i.is_active).length,
      errorRate: 0, // Calculate from sync logs
      avgSyncTime: 0, // Calculate from sync logs
      lastWeekSyncs: 0 // Calculate from sync logs
    };

    // Get sync logs for metrics
    const { data: syncLogs } = await supa
      .from("census_sync_logs")
      .select("*")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (syncLogs) {
      const totalSyncs = syncLogs.length;
      const errorSyncs = syncLogs.filter(log => log.status === 'error').length;
      metrics.errorRate = totalSyncs > 0 ? (errorSyncs / totalSyncs) * 100 : 0;
      metrics.lastWeekSyncs = totalSyncs;
      
      const successfulSyncs = syncLogs.filter(log => log.status === 'success' && log.execution_time_ms);
      if (successfulSyncs.length > 0) {
        metrics.avgSyncTime = successfulSyncs.reduce((sum, log) => sum + (log.execution_time_ms || 0), 0) / successfulSyncs.length;
      }
    }

    // Get integration health scores
    const integrations: IntegrationConfig[] = allIntegrations.map(integration => {
      const healthScore = calculateHealthScore(integration);
      return {
        id: integration.id,
        name: integration.name || integration.ehr_system || integration.provider || 'Unknown',
        type: integration.type as any,
        status: getIntegrationStatus(integration),
        lastSync: integration.last_sync_at,
        healthScore,
        features: getIntegrationFeatures(integration),
        configuration: getIntegrationConfig(integration)
      };
    });

    return NextResponse.json({
      success: true,
      metrics,
      integrations,
      availableIntegrations: getAvailableIntegrations()
    });

  } catch (error) {
    console.error("Advanced integrations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function calculateHealthScore(integration: any): number {
  let score = 100;
  
  // Deduct points for errors
  if (integration.last_sync_status === 'error') score -= 30;
  if (integration.error_message) score -= 20;
  
  // Deduct points for old syncs
  if (integration.last_sync_at) {
    const lastSync = new Date(integration.last_sync_at);
    const daysSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceSync > 7) score -= 25;
    else if (daysSinceSync > 3) score -= 10;
  }
  
  // Deduct points for inactive status
  if (!integration.is_active) score -= 50;
  
  return Math.max(0, score);
}

function getIntegrationStatus(integration: any): 'active' | 'inactive' | 'error' | 'pending' {
  if (!integration.is_active) return 'inactive';
  if (integration.last_sync_status === 'error') return 'error';
  if (integration.last_sync_status === 'pending') return 'pending';
  return 'active';
}

function getIntegrationFeatures(integration: any): string[] {
  const features = [];
  
  if (integration.type === 'ehr') {
    features.push('Census Sync', 'Patient Data', 'Staffing Data');
  } else if (integration.type === 'calendar') {
    features.push('Event Sync', 'Bidirectional Sync', 'Conflict Resolution');
  } else if (integration.type === 'supplier') {
    features.push('Product Sync', 'Invoice Processing', 'Cost Analytics');
  }
  
  return features;
}

function getIntegrationConfig(integration: any): Record<string, any> {
  const config: Record<string, any> = {};
  
  if (integration.sync_frequency) config.syncFrequency = integration.sync_frequency;
  if (integration.sync_time) config.syncTime = integration.sync_time;
  if (integration.api_endpoint) config.apiEndpoint = integration.api_endpoint;
  
  return config;
}

function getAvailableIntegrations() {
  return [
    {
      id: 'pointclickcare',
      name: 'PointClickCare',
      type: 'ehr',
      status: 'available',
      features: ['Census Sync', 'Patient Data', 'Staffing Data', 'Care Plans'],
      setupRequired: ['API Key', 'Facility ID', 'Client Secret']
    },
    {
      id: 'matrixcare',
      name: 'MatrixCare',
      type: 'ehr',
      status: 'coming_soon',
      features: ['Census Sync', 'Patient Data', 'Staffing Data'],
      setupRequired: ['API Key', 'Facility ID']
    },
    {
      id: 'google_calendar',
      name: 'Google Calendar',
      type: 'calendar',
      status: 'available',
      features: ['Event Sync', 'Bidirectional Sync', 'Conflict Resolution'],
      setupRequired: ['OAuth2 Credentials']
    },
    {
      id: 'outlook_calendar',
      name: 'Outlook Calendar',
      type: 'calendar',
      status: 'available',
      features: ['Event Sync', 'Bidirectional Sync', 'Conflict Resolution'],
      setupRequired: ['OAuth2 Credentials']
    },
    {
      id: 'cms_care_compare',
      name: 'CMS Care Compare',
      type: 'cms',
      status: 'available',
      features: ['Quality Ratings', 'Deficiency Data', 'Staffing Data'],
      setupRequired: ['API Key']
    },
    {
      id: 'supplier_api',
      name: 'Supplier API',
      type: 'supplier',
      status: 'available',
      features: ['Product Sync', 'Invoice Processing', 'Cost Analytics'],
      setupRequired: ['API Endpoint', 'Authentication']
    }
  ];
}
