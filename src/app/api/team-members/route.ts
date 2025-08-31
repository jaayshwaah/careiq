// src/app/api/team-members/route.ts - API for team member management
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // Get auth session
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = supabaseServerWithAuth(token);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Get team members from people the user has shared with or who have shared with them
    const { data: shareConnections, error: sharesError } = await supabase
      .from('chat_shares')
      .select(`
        shared_by,
        shared_with
      `)
      .or(`shared_by.eq.${user.id},shared_with.eq.${user.id}`)
      .eq('is_active', true);

    if (sharesError) {
      console.error('Team members fetch error:', sharesError);
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
    }

    // Extract unique team member IDs
    const teamMemberIds = new Set<string>();
    
    shareConnections?.forEach(connection => {
      if (connection.shared_by === user.id) {
        teamMemberIds.add(connection.shared_with);
      } else if (connection.shared_with === user.id) {
        teamMemberIds.add(connection.shared_by);
      }
    });

    // Get team member details from profiles
    const teamMembers: any[] = [];
    if (teamMemberIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, name, avatar_url, last_seen')
        .in('id', Array.from(teamMemberIds));

      if (profiles) {
        profiles.forEach(profile => {
          teamMembers.push({
            id: profile.id,
            email: profile.email,
            name: profile.name,
            avatar_url: profile.avatar_url,
            last_seen: profile.last_seen,
            role: 'Collaborator'
          });
        });
      }
    }

    teamMembers.sort((a, b) => (b.last_seen || '').localeCompare(a.last_seen || ''));

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
    const supabase = supabaseServerWithAuth(token);
    
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