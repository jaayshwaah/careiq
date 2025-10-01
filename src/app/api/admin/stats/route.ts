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

    // Calculate error rate from actual error logs
    const { count: errorCount } = await supa
      .from('error_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    const errorRate = totalRequests > 0 ? (errorCount || 0) / totalRequests : 0;
    
    // Calculate average response time from performance metrics
    const { data: responseTimeData } = await supa
      .from('performance_metrics')
      .select('metric_value')
      .eq('metric_name', 'api_response_time')
      .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: false })
      .limit(100);
    
    const avgResponseTime = responseTimeData && responseTimeData.length > 0 
      ? responseTimeData.reduce((sum, r) => sum + r.metric_value, 0) / responseTimeData.length 
      : 0;
    
    // Calculate storage used from actual data
    const { data: storageData } = await supa
      .from('performance_metrics')
      .select('metric_value')
      .eq('metric_name', 'storage_used')
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();
    
    const storageUsed = storageData ? `${(storageData.metric_value / 1024 / 1024 / 1024).toFixed(1)} GB` : "0 GB";

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
