// Team Management & Collaboration API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export const runtime = "nodejs";

interface TeamManagementRequest {
  action: 'create_team' | 'add_member' | 'remove_member' | 'update_role' | 'get_team' | 'get_teams';
  team_data?: {
    name: string;
    description: string;
    facility_id: string;
    team_type: 'department' | 'project' | 'committee' | 'shift';
    permissions: string[];
  };
  member_data?: {
    user_id: string;
    role: string;
    permissions: string[];
  };
  team_id?: string;
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
      action,
      team_data,
      member_data,
      team_id
    }: TeamManagementRequest = await req.json();

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    let result: any = {};

    switch (action) {
      case 'create_team':
        result = await createTeam(team_data, user.id, supa);
        break;
      
      case 'add_member':
        result = await addTeamMember(team_id, member_data, user.id, supa);
        break;
      
      case 'remove_member':
        result = await removeTeamMember(team_id, member_data?.user_id, user.id, supa);
        break;
      
      case 'update_role':
        result = await updateMemberRole(team_id, member_data, user.id, supa);
        break;
      
      case 'get_team':
        result = await getTeam(team_id, user.id, supa);
        break;
      
      case 'get_teams':
        result = await getTeams(user.id, supa);
        break;
      
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({
      result,
      message: `Team management action '${action}' completed successfully`
    });

  } catch (error: any) {
    console.error('Team management error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

async function createTeam(teamData: any, userId: string, supa: any) {
  if (!teamData || !teamData.name || !teamData.facility_id) {
    throw new Error("Team name and facility ID are required");
  }

  const { data: team, error } = await supa
    .from('teams')
    .insert({
      name: teamData.name,
      description: teamData.description || '',
      facility_id: teamData.facility_id,
      team_type: teamData.team_type || 'department',
      permissions: teamData.permissions || [],
      created_by: userId,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create team: ${error.message}`);
  }

  // Add creator as team leader
  await supa
    .from('team_members')
    .insert({
      team_id: team.id,
      user_id: userId,
      role: 'leader',
      permissions: ['manage_team', 'add_members', 'remove_members', 'assign_tasks'],
      joined_at: new Date().toISOString(),
      status: 'active'
    });

  return { team, message: "Team created successfully" };
}

async function addTeamMember(teamId: string, memberData: any, userId: string, supa: any) {
  if (!teamId || !memberData || !memberData.user_id) {
    throw new Error("Team ID and member data are required");
  }

  // Check if user has permission to add members
  const { data: userRole, error: roleError } = await supa
    .from('team_members')
    .select('role, permissions')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  if (roleError || !userRole || !userRole.permissions.includes('add_members')) {
    throw new Error("Insufficient permissions to add team members");
  }

  const { data: member, error } = await supa
    .from('team_members')
    .insert({
      team_id: teamId,
      user_id: memberData.user_id,
      role: memberData.role || 'member',
      permissions: memberData.permissions || ['view_team', 'participate'],
      joined_at: new Date().toISOString(),
      status: 'active',
      added_by: userId
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add team member: ${error.message}`);
  }

  return { member, message: "Team member added successfully" };
}

async function removeTeamMember(teamId: string, memberUserId: string, userId: string, supa: any) {
  if (!teamId || !memberUserId) {
    throw new Error("Team ID and member user ID are required");
  }

  // Check if user has permission to remove members
  const { data: userRole, error: roleError } = await supa
    .from('team_members')
    .select('role, permissions')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  if (roleError || !userRole || !userRole.permissions.includes('remove_members')) {
    throw new Error("Insufficient permissions to remove team members");
  }

  const { error } = await supa
    .from('team_members')
    .update({ status: 'removed', removed_at: new Date().toISOString(), removed_by: userId })
    .eq('team_id', teamId)
    .eq('user_id', memberUserId);

  if (error) {
    throw new Error(`Failed to remove team member: ${error.message}`);
  }

  return { message: "Team member removed successfully" };
}

async function updateMemberRole(teamId: string, memberData: any, userId: string, supa: any) {
  if (!teamId || !memberData || !memberData.user_id) {
    throw new Error("Team ID and member data are required");
  }

  // Check if user has permission to update roles
  const { data: userRole, error: roleError } = await supa
    .from('team_members')
    .select('role, permissions')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  if (roleError || !userRole || !userRole.permissions.includes('manage_team')) {
    throw new Error("Insufficient permissions to update member roles");
  }

  const { data: member, error } = await supa
    .from('team_members')
    .update({
      role: memberData.role,
      permissions: memberData.permissions,
      updated_at: new Date().toISOString(),
      updated_by: userId
    })
    .eq('team_id', teamId)
    .eq('user_id', memberData.user_id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update member role: ${error.message}`);
  }

  return { member, message: "Member role updated successfully" };
}

async function getTeam(teamId: string, userId: string, supa: any) {
  if (!teamId) {
    throw new Error("Team ID is required");
  }

  // Check if user is a member of the team
  const { data: membership, error: membershipError } = await supa
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (membershipError || !membership) {
    throw new Error("Access denied: Not a member of this team");
  }

  // Get team details
  const { data: team, error: teamError } = await supa
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();

  if (teamError) {
    throw new Error(`Failed to get team: ${teamError.message}`);
  }

  // Get team members
  const { data: members, error: membersError } = await supa
    .from('team_members')
    .select(`
      *,
      profiles!inner(full_name, email, role)
    `)
    .eq('team_id', teamId)
    .eq('status', 'active');

  if (membersError) {
    throw new Error(`Failed to get team members: ${membersError.message}`);
  }

  // Get team activities
  const { data: activities, error: activitiesError } = await supa
    .from('team_activities')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(20);

  return {
    team,
    members,
    activities: activities || [],
    user_membership: membership
  };
}

async function getTeams(userId: string, supa: any) {
  // Get teams where user is a member
  const { data: userTeams, error: teamsError } = await supa
    .from('team_members')
    .select(`
      *,
      teams!inner(*)
    `)
    .eq('user_id', userId)
    .eq('status', 'active');

  if (teamsError) {
    throw new Error(`Failed to get user teams: ${teamsError.message}`);
  }

  // Get team statistics
  const teamStats = await Promise.all(
    userTeams.map(async (userTeam: any) => {
      const teamId = userTeam.team_id;
      
      // Get member count
      const { count: memberCount } = await supa
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('status', 'active');

      // Get active tasks
      const { count: taskCount } = await supa
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .in('status', ['pending', 'in_progress']);

      return {
        ...userTeam.teams,
        user_role: userTeam.role,
        user_permissions: userTeam.permissions,
        member_count: memberCount || 0,
        active_tasks: taskCount || 0
      };
    })
  );

  return { teams: teamStats };
}
