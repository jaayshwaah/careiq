// src/app/api/team-members/route.ts - API for team member management
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
  try {
    // Get auth session
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = getServerSupabase(token);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Get team members from people the user has shared with or who have shared with them
    const { data: shareConnections, error: sharesError } = await supabase
      .from('chat_shares')
      .select(`
        shared_by,
        shared_with,
        shared_by_user:auth.users!shared_by(id, email, raw_user_meta_data, last_sign_in_at),
        shared_with_user:auth.users!shared_with(id, email, raw_user_meta_data, last_sign_in_at)
      `)
      .or(`shared_by.eq.${user.id},shared_with.eq.${user.id}`)
      .eq('is_active', true);

    if (sharesError) {
      console.error('Team members fetch error:', sharesError);
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
    }

    // Extract unique team members
    const teamMemberSet = new Set<string>();
    const teamMembersMap = new Map();

    shareConnections?.forEach(connection => {
      // Add the other person as a team member
      if (connection.shared_by === user.id && connection.shared_with_user) {
        if (!teamMemberSet.has(connection.shared_with)) {
          teamMemberSet.add(connection.shared_with);
          teamMembersMap.set(connection.shared_with, {
            id: connection.shared_with_user.id,
            email: connection.shared_with_user.email,
            name: connection.shared_with_user.raw_user_meta_data?.name || 
                  connection.shared_with_user.raw_user_meta_data?.full_name,
            avatar_url: connection.shared_with_user.raw_user_meta_data?.avatar_url,
            last_seen: connection.shared_with_user.last_sign_in_at,
            role: 'Collaborator'
          });
        }
      } else if (connection.shared_with === user.id && connection.shared_by_user) {
        if (!teamMemberSet.has(connection.shared_by)) {
          teamMemberSet.add(connection.shared_by);
          teamMembersMap.set(connection.shared_by, {
            id: connection.shared_by_user.id,
            email: connection.shared_by_user.email,
            name: connection.shared_by_user.raw_user_meta_data?.name || 
                  connection.shared_by_user.raw_user_meta_data?.full_name,
            avatar_url: connection.shared_by_user.raw_user_meta_data?.avatar_url,
            last_seen: connection.shared_by_user.last_sign_in_at,
            role: 'Team Member'
          });
        }
      }
    });

    const teamMembers = Array.from(teamMembersMap.values())
      .sort((a, b) => (b.last_seen || '').localeCompare(a.last_seen || ''));

    return NextResponse.json({
      success: true,
      members: teamMembers,
      total: teamMembers.length
    });

  } catch (error) {
    console.error('Team members GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

// Optional: Add team member by organization domain
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, role = 'Collaborator' } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Get auth session
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = getServerSupabase(token);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // For now, team members are implicit through sharing
    // This could be extended to support formal team/organization structure
    return NextResponse.json({
      success: true,
      message: 'Team members are added automatically when you share chats'
    });

  } catch (error) {
    console.error('Team members POST error:', error);
    return NextResponse.json(
      { error: 'Failed to add team member' },
      { status: 500 }
    );
  }
}