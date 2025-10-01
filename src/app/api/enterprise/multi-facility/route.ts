// Multi-Facility Management API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export const runtime = "nodejs";

interface MultiFacilityRequest {
  action: 'create_facility' | 'update_facility' | 'delete_facility' | 'get_facilities' | 'get_facility' | 'assign_user' | 'get_facility_users' | 'get_cross_facility_analytics';
  facility_data?: {
    name: string;
    facility_type: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    phone: string;
    email: string;
    license_number: string;
    medicare_number: string;
    medicaid_number: string;
    bed_count: number;
    staff_count: number;
    plan_type: string;
    parent_organization_id?: string;
    settings: any;
  };
  user_assignment?: {
    user_id: string;
    role: string;
    permissions: string[];
    is_primary: boolean;
  };
  facility_id?: string;
  organization_id?: string;
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

    // Check if user has enterprise permissions
    const { data: profile } = await supa
      .from('profiles')
      .select('role, is_admin')
      .eq('user_id', user.id)
      .single();

    if (!profile?.is_admin && !profile?.role?.includes('enterprise')) {
      return NextResponse.json({ error: "Enterprise access required" }, { status: 403 });
    }

    const {
      action,
      facility_data,
      user_assignment,
      facility_id,
      organization_id
    }: MultiFacilityRequest = await req.json();

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    let result: any = {};

    switch (action) {
      case 'create_facility':
        result = await createFacility(facility_data, user.id, supa);
        break;
      
      case 'update_facility':
        result = await updateFacility(facility_id, facility_data, user.id, supa);
        break;
      
      case 'delete_facility':
        result = await deleteFacility(facility_id, user.id, supa);
        break;
      
      case 'get_facilities':
        result = await getFacilities(organization_id, user.id, supa);
        break;
      
      case 'get_facility':
        result = await getFacility(facility_id, user.id, supa);
        break;
      
      case 'assign_user':
        result = await assignUserToFacility(facility_id, user_assignment, user.id, supa);
        break;
      
      case 'get_facility_users':
        result = await getFacilityUsers(facility_id, user.id, supa);
        break;
      
      case 'get_cross_facility_analytics':
        result = await getCrossFacilityAnalytics(organization_id, user.id, supa);
        break;
      
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({
      result,
      message: `Multi-facility action '${action}' completed successfully`
    });

  } catch (error: any) {
    console.error('Multi-facility management error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

async function createFacility(facilityData: any, userId: string, supa: any) {
  if (!facilityData || !facilityData.name || !facilityData.facility_type) {
    throw new Error("Facility name and type are required");
  }

  const { data: facility, error } = await supa
    .from('facilities')
    .insert({
      name: facilityData.name,
      facility_type: facilityData.facility_type,
      address: facilityData.address || '',
      city: facilityData.city || '',
      state: facilityData.state || '',
      zip_code: facilityData.zip_code || '',
      phone: facilityData.phone || '',
      email: facilityData.email || '',
      license_number: facilityData.license_number || '',
      medicare_number: facilityData.medicare_number || '',
      medicaid_number: facilityData.medicaid_number || '',
      bed_count: facilityData.bed_count || 0,
      staff_count: facilityData.staff_count || 0,
      plan_type: facilityData.plan_type || 'basic',
      parent_organization_id: facilityData.parent_organization_id || null,
      status: 'active',
      created_by: userId
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create facility: ${error.message}`);
  }

  // Create facility settings
  await supa
    .from('facility_settings')
    .insert({
      facility_id: facility.id,
      settings: facilityData.settings || {}
    });

  // Create default facility units
  await createDefaultFacilityUnits(facility.id, supa);

  return { facility, message: "Facility created successfully" };
}

async function updateFacility(facilityId: string, facilityData: any, userId: string, supa: any) {
  if (!facilityId || !facilityData) {
    throw new Error("Facility ID and data are required");
  }

  const { data: facility, error } = await supa
    .from('facilities')
    .update({
      ...facilityData,
      updated_at: new Date().toISOString()
    })
    .eq('id', facilityId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update facility: ${error.message}`);
  }

  // Update facility settings if provided
  if (facilityData.settings) {
    await supa
      .from('facility_settings')
      .update({ settings: facilityData.settings })
      .eq('facility_id', facilityId);
  }

  return { facility, message: "Facility updated successfully" };
}

async function deleteFacility(facilityId: string, userId: string, supa: any) {
  if (!facilityId) {
    throw new Error("Facility ID is required");
  }

  // Soft delete - set status to inactive
  const { data: facility, error } = await supa
    .from('facilities')
    .update({
      status: 'inactive',
      updated_at: new Date().toISOString()
    })
    .eq('id', facilityId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to delete facility: ${error.message}`);
  }

  return { facility, message: "Facility deleted successfully" };
}

async function getFacilities(organizationId: string | undefined, userId: string, supa: any) {
  let query = supa
    .from('facilities')
    .select(`
      *,
      facility_settings(settings),
      user_facility_assignments!inner(
        user_id,
        role_id,
        is_primary,
        status,
        staff_roles(name, description)
      )
    `)
    .eq('active', true);

  if (organizationId) {
    query = query.eq('parent_organization_id', organizationId);
  }

  const { data: facilities, error } = await query;

  if (error) {
    throw new Error(`Failed to get facilities: ${error.message}`);
  }

  // Get facility statistics
  const facilitiesWithStats = await Promise.all(
    facilities.map(async (facility: any) => {
      const stats = await getFacilityStatistics(facility.id, supa);
      return { ...facility, statistics: stats };
    })
  );

  return { facilities: facilitiesWithStats };
}

async function getFacility(facilityId: string, userId: string, supa: any) {
  if (!facilityId) {
    throw new Error("Facility ID is required");
  }

  const { data: facility, error } = await supa
    .from('facilities')
    .select(`
      *,
      facility_settings(settings),
      user_facility_assignments(
        user_id,
        role_id,
        is_primary,
        status,
        staff_roles(name, description),
        profiles(full_name, email, role)
      )
    `)
    .eq('id', facilityId)
    .single();

  if (error) {
    throw new Error(`Failed to get facility: ${error.message}`);
  }

  // Get comprehensive facility data
  const statistics = await getFacilityStatistics(facilityId, supa);
  const recentActivities = await getFacilityRecentActivities(facilityId, supa);
  const complianceStatus = await getFacilityComplianceStatus(facilityId, supa);

  return {
    facility,
    statistics,
    recent_activities: recentActivities,
    compliance_status: complianceStatus
  };
}

async function assignUserToFacility(facilityId: string, userAssignment: any, userId: string, supa: any) {
  if (!facilityId || !userAssignment || !userAssignment.user_id) {
    throw new Error("Facility ID and user assignment data are required");
  }

  const { data: assignment, error } = await supa
    .from('user_facility_assignments')
    .insert({
      facility_id: facilityId,
      user_id: userAssignment.user_id,
      role_id: userAssignment.role_id || null,
      is_primary: userAssignment.is_primary || false,
      status: 'active',
      assigned_by: userId,
      assigned_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to assign user to facility: ${error.message}`);
  }

  // Update user's primary facility if this is their primary assignment
  if (userAssignment.is_primary) {
    await supa
      .from('profiles')
      .update({ facility_id: facilityId })
      .eq('user_id', userAssignment.user_id);
  }

  return { assignment, message: "User assigned to facility successfully" };
}

async function getFacilityUsers(facilityId: string, userId: string, supa: any) {
  if (!facilityId) {
    throw new Error("Facility ID is required");
  }

  const { data: users, error } = await supa
    .from('user_facility_assignments')
    .select(`
      *,
      profiles(full_name, email, role, is_admin),
      staff_roles(name, description, permissions)
    `)
    .eq('facility_id', facilityId)
    .eq('status', 'active');

  if (error) {
    throw new Error(`Failed to get facility users: ${error.message}`);
  }

  return { users };
}

async function getCrossFacilityAnalytics(organizationId: string | undefined, userId: string, supa: any) {
  // Get all facilities for the organization
  let facilitiesQuery = supa
    .from('facilities')
    .select('id, name, facility_type, bed_count, staff_count')
    .eq('active', true);

  if (organizationId) {
    facilitiesQuery = facilitiesQuery.eq('parent_organization_id', organizationId);
  }

  const { data: facilities, error: facilitiesError } = await facilitiesQuery;

  if (facilitiesError) {
    throw new Error(`Failed to get facilities: ${facilitiesError.message}`);
  }

  // Get cross-facility analytics
  const analytics = await Promise.all(
    facilities.map(async (facility: any) => {
      const stats = await getFacilityStatistics(facility.id, supa);
      return {
        facility_id: facility.id,
        facility_name: facility.name,
        facility_type: facility.facility_type,
        ...stats
      };
    })
  );

  // Calculate organization-wide metrics
  const organizationMetrics = {
    total_facilities: facilities.length,
    total_beds: facilities.reduce((sum, f) => sum + (f.bed_count || 0), 0),
    total_staff: facilities.reduce((sum, f) => sum + (f.staff_count || 0), 0),
    avg_occupancy_rate: 0,
    avg_quality_score: 0,
    compliance_rate: 0
  };

  // Calculate averages
  const validMetrics = analytics.filter(a => a.occupancy_rate && a.quality_score);
  if (validMetrics.length > 0) {
    organizationMetrics.avg_occupancy_rate = validMetrics.reduce((sum, a) => sum + a.occupancy_rate, 0) / validMetrics.length;
    organizationMetrics.avg_quality_score = validMetrics.reduce((sum, a) => sum + a.quality_score, 0) / validMetrics.length;
  }

  return {
    facilities: analytics,
    organization_metrics: organizationMetrics,
    generated_at: new Date().toISOString()
  };
}

// Helper functions
async function createDefaultFacilityUnits(facilityId: string, supa: any) {
  const defaultUnits = [
    { name: 'Unit A', unit_code: 'A', floor_number: 1, capacity: 20, unit_type: 'skilled_nursing' },
    { name: 'Unit B', unit_code: 'B', floor_number: 1, capacity: 20, unit_type: 'skilled_nursing' },
    { name: 'Memory Care', unit_code: 'MC', floor_number: 2, capacity: 15, unit_type: 'memory_care' },
    { name: 'Rehabilitation', unit_code: 'REHAB', floor_number: 1, capacity: 10, unit_type: 'rehabilitation' }
  ];

  for (const unit of defaultUnits) {
    await supa
      .from('facility_units')
      .insert({
        ...unit,
        facility_id: facilityId,
        is_active: true
      });
  }
}

async function getFacilityStatistics(facilityId: string, supa: any) {
  try {
    // Get census data
    const { data: censusData } = await supa
      .from('census_snapshots')
      .select('occupied_beds, total_beds, admission_count, discharge_count')
      .eq('facility_id', facilityId)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    // Get quality indicators
    const { data: qualityData } = await supa
      .from('quality_indicators')
      .select('indicator_value, target_value')
      .eq('facility_id', facilityId)
      .eq('status', 'active');

    // Get active tasks
    const { count: activeTasks } = await supa
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('facility_id', facilityId)
      .in('status', ['pending', 'in_progress']);

    // Calculate metrics
    const occupancyRate = censusData ? (censusData.occupied_beds / censusData.total_beds) * 100 : 0;
    const qualityScore = qualityData && qualityData.length > 0 
      ? qualityData.reduce((sum, q) => sum + (q.indicator_value || 0), 0) / qualityData.length 
      : 0;

    return {
      occupancy_rate: occupancyRate,
      quality_score: qualityScore,
      active_tasks: activeTasks || 0,
      total_beds: censusData?.total_beds || 0,
      occupied_beds: censusData?.occupied_beds || 0,
      admissions: censusData?.admission_count || 0,
      discharges: censusData?.discharge_count || 0
    };
  } catch (error) {
    console.error('Error getting facility statistics:', error);
    return {
      occupancy_rate: 0,
      quality_score: 0,
      active_tasks: 0,
      total_beds: 0,
      occupied_beds: 0,
      admissions: 0,
      discharges: 0
    };
  }
}

async function getFacilityRecentActivities(facilityId: string, supa: any) {
  try {
    const { data: activities } = await supa
      .from('team_activities')
      .select('*')
      .eq('facility_id', facilityId)
      .order('created_at', { ascending: false })
      .limit(10);

    return activities || [];
  } catch (error) {
    console.error('Error getting facility activities:', error);
    return [];
  }
}

async function getFacilityComplianceStatus(facilityId: string, supa: any) {
  try {
    const { data: complianceData } = await supa
      .from('quality_assessments')
      .select('assessment_result')
      .eq('facility_id', facilityId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (complianceData?.assessment_result) {
      return {
        overall_score: complianceData.assessment_result.overall_score || 0,
        compliance_status: complianceData.assessment_result.compliance_status || 'unknown',
        risk_level: complianceData.assessment_result.risk_level || 'unknown',
        last_assessment: complianceData.assessment_result.generated_at
      };
    }

    return {
      overall_score: 0,
      compliance_status: 'unknown',
      risk_level: 'unknown',
      last_assessment: null
    };
  } catch (error) {
    console.error('Error getting facility compliance status:', error);
    return {
      overall_score: 0,
      compliance_status: 'unknown',
      risk_level: 'unknown',
      last_assessment: null
    };
  }
}
