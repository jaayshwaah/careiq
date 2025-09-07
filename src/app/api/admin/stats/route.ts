import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Use service role to bypass RLS for accurate counts
    const supa = supabaseService();

    // Get all stats in parallel
    const [
      usersResult,
      chatsResult,
      messagesResult,
      knowledgeResult,
      activeUsersResult
    ] = await Promise.all([
      // Total users (from profiles table)
      supa
        .from('profiles')
        .select('user_id', { count: 'exact', head: true }),
      
      // Total chats
      supa
        .from('chats')
        .select('id', { count: 'exact', head: true }),
      
      // Total messages
      supa
        .from('messages')
        .select('id', { count: 'exact', head: true }),
      
      // Knowledge base entries
      supa
        .from('knowledge_base')
        .select('id', { count: 'exact', head: true }),
      
      // Active users in last 24 hours (from profiles updated_at)
      supa
        .from('profiles')
        .select('user_id', { count: 'exact', head: true })
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    ]);

    // Calculate error rate (mock for now - would need actual error tracking)
    const errorRate = 0.02; // 2% error rate
    
    // Calculate average response time (mock for now - would need actual timing data)
    const avgResponseTime = 1.2; // 1.2 seconds
    
    // Calculate storage used (mock for now - would need actual storage calculation)
    const storageUsed = "2.4 GB";

    const stats = {
      totalUsers: usersResult.count || 0,
      totalChats: chatsResult.count || 0,
      totalMessages: messagesResult.count || 0,
      knowledgeBaseEntries: knowledgeResult.count || 0,
      activeUsers24h: activeUsersResult.count || 0,
      errorRate: errorRate,
      avgResponseTime: avgResponseTime,
      storageUsed: storageUsed
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch admin stats' 
    }, { status: 500 });
  }
}
