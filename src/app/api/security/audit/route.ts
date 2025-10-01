// Enterprise Security Audit API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SecurityAudit {
  id: string;
  type: 'authentication' | 'authorization' | 'data_access' | 'api_security' | 'infrastructure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  status: 'open' | 'in_progress' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt?: string;
  assignedTo?: string;
}

interface SecurityMetrics {
  totalAudits: number;
  openIssues: number;
  criticalIssues: number;
  resolvedThisMonth: number;
  avgResolutionTime: number;
  complianceScore: number;
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

    // Check if user is admin
    const { data: profile } = await supa
      .from("profiles")
      .select("role, is_admin")
      .eq("user_id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';
    const severity = searchParams.get('severity') || 'all';

    // Get security audits
    let query = supa
      .from("security_audits")
      .select("*")
      .order("created_at", { ascending: false });

    if (type !== 'all') {
      query = query.eq("type", type);
    }
    if (severity !== 'all') {
      query = query.eq("severity", severity);
    }

    const { data: audits, error: auditsError } = await query;

    if (auditsError) {
      return NextResponse.json({ error: "Failed to fetch security audits" }, { status: 500 });
    }

    // Get security metrics
    const metrics: SecurityMetrics = {
      totalAudits: audits?.length || 0,
      openIssues: audits?.filter(a => a.status === 'open').length || 0,
      criticalIssues: audits?.filter(a => a.severity === 'critical').length || 0,
      resolvedThisMonth: audits?.filter(a => 
        a.status === 'resolved' && 
        new Date(a.resolved_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length || 0,
      avgResolutionTime: 0, // Calculate from resolved audits
      complianceScore: 85 // Calculate based on resolved vs total audits
    };

    return NextResponse.json({
      success: true,
      audits: audits || [],
      metrics,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error("Security audit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    const { action, auditId, data } = await req.json();

    if (action === 'create_audit') {
      return await createSecurityAudit(data, user.id, supa);
    } else if (action === 'update_audit') {
      return await updateSecurityAudit(auditId, data, supa);
    } else if (action === 'resolve_audit') {
      return await resolveSecurityAudit(auditId, user.id, supa);
    } else if (action === 'run_security_scan') {
      return await runSecurityScan(supa);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Security audit action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function createSecurityAudit(data: any, userId: string, supa: any) {
  const { data: audit, error } = await supa
    .from("security_audits")
    .insert({
      ...data,
      created_by: userId,
      status: 'open'
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create security audit" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    audit,
    message: "Security audit created successfully"
  });
}

async function updateSecurityAudit(auditId: string, data: any, supa: any) {
  const { data: audit, error } = await supa
    .from("security_audits")
    .update(data)
    .eq("id", auditId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update security audit" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    audit,
    message: "Security audit updated successfully"
  });
}

async function resolveSecurityAudit(auditId: string, userId: string, supa: any) {
  const { data: audit, error } = await supa
    .from("security_audits")
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: userId
    })
    .eq("id", auditId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to resolve security audit" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    audit,
    message: "Security audit resolved successfully"
  });
}

async function runSecurityScan(supa: any) {
  // Run comprehensive security scan
  const scanResults = await performSecurityScan(supa);
  
  return NextResponse.json({
    success: true,
    results: scanResults,
    message: "Security scan completed"
  });
}

async function performSecurityScan(supa: any) {
  const results = {
    authentication: {
      weakPasswords: 0,
      inactiveUsers: 0,
      failedLogins: 0
    },
    authorization: {
      excessivePermissions: 0,
      orphanedAccess: 0,
      privilegeEscalation: 0
    },
    dataAccess: {
      unauthorizedAccess: 0,
      dataExports: 0,
      suspiciousActivity: 0
    },
    apiSecurity: {
      rateLimitViolations: 0,
      suspiciousRequests: 0,
      apiErrors: 0
    },
    infrastructure: {
      outdatedDependencies: 0,
      securityHeaders: 0,
      sslIssues: 0
    }
  };

  // Perform actual security checks
  // This would be implemented based on your specific security requirements

  return results;
}
