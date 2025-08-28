// src/app/api/survey-prep/route.ts - Survey Preparation API
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

const SURVEY_CHECKLIST_SECTIONS = {
  documentation: {
    title: 'Documentation & Records',
    items: [
      { id: 'policies', task: 'Review and update all facility policies', critical: true, ftag: 'F880' },
      { id: 'qapi', task: 'Ensure QAPI plan is current', critical: true, ftag: 'F865' },
      { id: 'staffing', task: 'Verify staffing records and PBJ submissions', critical: true, ftag: 'F725' },
      // ... more items
    ]
  },
  // ... more sections
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const surveyType = searchParams.get('surveyType') || 'Standard';
    const facilityType = searchParams.get('facilityType') || 'SNF';

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const supa = supabaseServerWithAuth(token);

    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get user's saved progress
    const { data: progress } = await supa
      .from("survey_prep_progress")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Generate customized checklist based on survey type and facility type
    const customizedSections = generateCustomChecklist(surveyType, facilityType);

    return NextResponse.json({
      ok: true,
      sections: customizedSections,
      progress: progress?.checklist_data || {},
      surveyType,
      facilityType
    });

  } catch (error: any) {
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { checklistData, surveyType, facilityType, notes, assignments } = await req.json();

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const supa = supabaseServerWithAuth(token);

    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Save progress
    const { error } = await supa
      .from("survey_prep_progress")
      .upsert({
        user_id: user.id,
        checklist_data: checklistData,
        survey_type: surveyType,
        facility_type: facilityType,
        notes: notes || {},
        assignments: assignments || {},
        last_updated: new Date().toISOString()
      });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}

function generateCustomChecklist(surveyType: string, facilityType: string) {
  // Customize checklist based on survey type and facility type
  const sections = { ...SURVEY_CHECKLIST_SECTIONS };
  
  if (surveyType === 'Complaint') {
    // Focus on specific areas for complaint surveys
    sections.documentation.items = sections.documentation.items.filter(item => 
      ['policies', 'incident-reports'].includes(item.id)
    );
  }
  
  if (facilityType === 'ICF/IID') {
    // Add ICF/IID specific requirements
    sections.residents = {
      title: 'Individual Program Plans',
      items: [
        { id: 'ipp', task: 'Review Individual Program Plans (IPP)', critical: true, ftag: 'F870' },
        { id: 'active-treatment', task: 'Verify active treatment programs', critical: true, ftag: 'F871' }
      ]
    };
  }
  
  return sections;
}

// src/app/api/knowledge/smart-search/route.ts - Enhanced Knowledge Search
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { buildRagContext } from "@/lib/ai/buildRagContext";

export async function POST(req: NextRequest) {
  try {
    const { query, context = {}, filters = {} } = await req.json();
    
    if (!query?.trim()) {
      return NextResponse.json({ ok: false, error: "Query required" }, { status: 400 });
    }

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const supa = supabaseServerWithAuth(token);

    const { data: { user } } = await supa.auth.getUser();
    
    // Get user profile for context
    let userProfile = null;
    if (user) {
      const { data: profile } = await supa
        .from("profiles")
        .select("role, facility_id, facility_name, facility_state")
        .eq("user_id", user.id)
        .single();
      userProfile = profile;
    }

    // Build enhanced RAG context with user-specific information
    const ragContext = await buildRagContext({
      query,
      facilityId: userProfile?.facility_id || filters.facilityId,
      facilityState: userProfile?.facility_state || filters.state,
      category: filters.category,
      topK: filters.limit || 8,
      accessToken: token,
      useVector: true
    });

    // Parse the context to extract structured results
    const results = parseRagContext(ragContext);

    // Add smart categorization
    const categorizedResults = categorizeResults(results, query, userProfile);

    return NextResponse.json({
      ok: true,
      results: categorizedResults,
      context: ragContext,
      userContext: {
        role: userProfile?.role,
        facility: userProfile?.facility_name,
        state: userProfile?.facility_state
      }
    });

  } catch (error: any) {
    console.error("Smart search error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}

function parseRagContext(context: string) {
  // Parse the structured context to extract individual results
  const results = [];
  const sections = context.split(/\*\*[^*]+:\*\*/);
  
  sections.forEach((section, index) => {
    if (index === 0) return; // Skip header
    
    const entries = section.split(/\(\d+\)/);
    entries.forEach(entry => {
      if (!entry.trim()) return;
      
      const lines = entry.trim().split('\n');
      const title = lines[0]?.trim();
      const content = lines.slice(1).join('\n').trim();
      
      if (title && content) {
        results.push({
          id: `result-${index}-${results.length}`,
          title,
          content,
          category: determineCategoryFromContent(entry),
          relevanceScore: calculateRelevanceScore(entry),
          source: extractSource(entry)
        });
      }
    });
  });
  
  return results;
}

function categorizeResults(results: any[], query: string, userProfile: any) {
  const categorized = {
    critical: [],
    roleSpecific: [],
    general: [],
    facilitySpecific: []
  };

  results.forEach(result => {
    // Critical items (F-tags, regulations)
    if (result.content.includes('CFR') || result.content.includes('F-tag') || result.content.includes('must')) {
      categorized.critical.push({ ...result, priority: 'critical' });
    }
    
    // Role-specific content
    else if (userProfile?.role && result.content.toLowerCase().includes(userProfile.role.toLowerCase())) {
      categorized.roleSpecific.push({ ...result, priority: 'role-specific' });
    }
    
    // Facility-specific content
    else if (userProfile?.facility_name && result.content.includes(userProfile.facility_name)) {
      categorized.facilitySpecific.push({ ...result, priority: 'facility-specific' });
    }
    
    // General content
    else {
      categorized.general.push({ ...result, priority: 'general' });
    }
  });

  // Flatten with priority ordering
  return [
    ...categorized.critical,
    ...categorized.roleSpecific,
    ...categorized.facilitySpecific,
    ...categorized.general
  ].slice(0, 10); // Limit results
}

function determineCategoryFromContent(content: string): string {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('cms') || lowerContent.includes('cfr')) return 'Federal Regulation';
  if (lowerContent.includes('state') || lowerContent.includes('california') || lowerContent.includes('texas')) return 'State Regulation';
  if (lowerContent.includes('joint commission')) return 'Accreditation';
  if (lowerContent.includes('cdc')) return 'Public Health';
  if (lowerContent.includes('policy') || lowerContent.includes('procedure')) return 'Policy';
  
  return 'General';
}

function calculateRelevanceScore(content: string): number {
  // Simple relevance scoring based on content indicators
  let score = 0.5; // Base score
  
  if (content.includes('CFR')) score += 0.3;
  if (content.includes('F-tag')) score += 0.2;
  if (content.includes('must') || content.includes('shall')) score += 0.1;
  if (content.includes('Source')) score += 0.1;
  
  return Math.min(score, 1.0);
}

function extractSource(content: string): string | null {
  const sourceMatch = content.match(/\[Source\]\((.*?)\)/);
  return sourceMatch ? sourceMatch[1] : null;
}

// src/app/api/chat/contextual/route.ts - Enhanced Contextual Chat
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { buildRagContext } from "@/lib/ai/buildRagContext";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(req: NextRequest) {
  try {
    const { messages, chatId } = await req.json();
    
    if (!messages?.length) {
      return NextResponse.json({ ok: false, error: "Messages required" }, { status: 400 });
    }

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const supa = supabaseServerWithAuth(token);

    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get enhanced user context
    const { data: profile } = await supa
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const lastMessage = messages[messages.length - 1];
    
    // Build enhanced system prompt with user context
    const systemPrompt = buildEnhancedSystemPrompt(profile);
    
    // Get RAG context for the query
    const ragContext = await buildRagContext({
      query: lastMessage.content,
      facilityId: profile?.facility_id,
      facilityState: profile?.facility_state,
      topK: 6,
      accessToken: token,
      useVector: true
    });

    // Prepare messages for AI
    const aiMessages = [
      { role: "system", content: systemPrompt + (ragContext ? `\n\n${ragContext}` : '') },
      ...messages.slice(-6), // Keep recent conversation context
    ];

    // Call OpenRouter
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "AI service not configured" }, { status: 503 });
    }

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://careiq.vercel.app",
        "X-Title": "CareIQ Enhanced Chat",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openai/gpt-4o",
        messages: aiMessages,
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenRouter error:", response.status, error);
      return NextResponse.json({ ok: false, error: "AI service error" }, { status: 503 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "I apologize, but I couldn't generate a response.";

    return NextResponse.json({
      ok: true,
      content,
      context: {
        role: profile?.role,
        facility: profile?.facility_name,
        state: profile?.facility_state,
        ragSources: ragContext ? extractSourceCount(ragContext) : 0
      }
    });

  } catch (error: any) {
    console.error("Contextual chat error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}

function buildEnhancedSystemPrompt(profile: any): string {
  const role = profile?.role || 'healthcare professional';
  const facility = profile?.facility_name || 'your facility';
  const state = profile?.facility_state || '';
  
  return `You are CareIQ, an expert AI assistant for U.S. nursing home compliance and operations.

CONTEXT:
- User Role: ${role}
- Facility: ${facility}${state ? ` (${state})` : ''}
- Current Date: ${new Date().toLocaleDateString()}

INSTRUCTIONS:
1. Provide role-specific guidance tailored to ${role} responsibilities
2. Reference facility-specific context when relevant
3. Include ${state ? `${state}-specific` : 'state-specific'} requirements when applicable
4. Cite specific regulation numbers (42 CFR, F-tags) with explanations
5. Provide actionable, step-by-step guidance
6. Use clear, professional language without excessive formatting

RESPONSE STRUCTURE:
- Direct answer to the question
- Relevant regulatory requirements
- Specific action items for ${role}
- State/facility considerations
- Additional resources or next steps

Focus on practical compliance guidance that ${role} can immediately implement at ${facility}.`;
}

function extractSourceCount(ragContext: string): number {
  const matches = ragContext.match(/\(\d+\)/g);
  return matches ? matches.length : 0;
}

// src/app/api/dashboard/analytics/route.ts - Analytics Dashboard
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const supa = supabaseServerWithAuth(token);

    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get user's facility information
    const { data: profile } = await supa
      .from("profiles")
      .select("facility_id, facility_name, facility_state, role")
      .eq("user_id", user.id)
      .single();

    // Calculate date ranges
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get chat statistics
    const { data: totalChats } = await supa
      .from("chats")
      .select("id", { count: 'exact' })
      .eq("user_id", user.id);

    const { data: recentChats } = await supa
      .from("chats")
      .select("id", { count: 'exact' })
      .eq("user_id", user.id)
      .gte("created_at", last7Days.toISOString());

    // Get message statistics
    const { data: messageStats } = await supa
      .rpc("get_user_message_stats", { p_user_id: user.id });

    // Get knowledge base usage
    const { data: knowledgeStats } = await supa
      .from("knowledge_base")
      .select("category", { count: 'exact' })
      .eq("facility_id", profile?.facility_id || null);

    // Get popular topics (mock data for now)
    const popularTopics = [
      { topic: 'Survey Preparation', queries: 45, trend: '+12%' },
      { topic: 'F-tag Compliance', queries: 38, trend: '+8%' },
      { topic: 'Staffing Requirements', queries: 29, trend: '+15%' },
      { topic: 'Infection Control', queries: 25, trend: '-3%' },
      { topic: 'Quality Measures', queries: 22, trend: '+7%' }
    ];

    // Survey readiness score (mock calculation)
    const surveyReadiness = calculateSurveyReadiness(user.id, supa);

    const analytics = {
      overview: {
        totalChats: totalChats?.length || 0,
        recentChats: recentChats?.length || 0,
        totalMessages: messageStats?.[0]?.total_messages || 0,
        avgMessagesPerChat: messageStats?.[0]?.avg_messages_per_chat || 0,
        knowledgeBaseItems: knowledgeStats?.length || 0
      },
      usage: {
        last7Days: {
          chats: recentChats?.length || 0,
          messages: messageStats?.[0]?.recent_messages || 0
        },
        last30Days: {
          chats: totalChats?.length || 0,
          messages: messageStats?.[0]?.total_messages || 0
        }
      },
      topicTrends: popularTopics,
      surveyReadiness: await surveyReadiness,
      userContext: {
        role: profile?.role,
        facility: profile?.facility_name,
        state: profile?.facility_state
      }
    };

    return NextResponse.json({
      ok: true,
      analytics
    });

  } catch (error: any) {
    console.error("Analytics error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}

async function calculateSurveyReadiness(userId: string, supa: any) {
  try {
    // Get survey prep progress
    const { data: progress } = await supa
      .from("survey_prep_progress")
      .select("checklist_data")
      .eq("user_id", userId)
      .single();

    if (!progress?.checklist_data) {
      return {
        score: 0,
        status: 'Not Started',
        criticalItems: 0,
        totalItems: 0
      };
    }

    const checkedItems = Object.keys(progress.checklist_data).filter(
      key => progress.checklist_data[key] === true
    );

    // Mock calculation - would use actual checklist structure
    const totalCriticalItems = 25;
    const completedCriticalItems = Math.min(checkedItems.length, totalCriticalItems);
    const score = Math.round((completedCriticalItems / totalCriticalItems) * 100);

    return {
      score,
      status: score >= 90 ? 'Survey Ready' : score >= 70 ? 'Almost Ready' : score >= 50 ? 'In Progress' : 'Needs Attention',
      criticalItems: completedCriticalItems,
      totalItems: totalCriticalItems
    };

  } catch (error) {
    return {
      score: 0,
      status: 'Unknown',
      criticalItems: 0,
      totalItems: 0
    };
  }
}

// src/app/api/bookmarks/route.ts - Enhanced Bookmarks
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const supa = supabaseServerWithAuth(token);

    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let query = supa
      .from("bookmarks")
      .select(`
        *,
        chats!inner(title, created_at)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (category) {
      query = query.contains("tags", [category]);
    }

    if (search) {
      query = query.ilike("message_text", `%${search}%`);
    }

    const { data: bookmarks, error } = await query.limit(50);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Categorize bookmarks
    const categorized = categorizeBookmarks(bookmarks || []);

    return NextResponse.json({
      ok: true,
      bookmarks: bookmarks || [],
      categorized,
      total: bookmarks?.length || 0
    });

  } catch (error: any) {
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messageId, chatId, messageText, tags = [], category } = await req.json();

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const supa = supabaseServerWithAuth(token);

    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Auto-generate tags based on content
    const autoTags = generateAutoTags(messageText);
    const finalTags = [...new Set([...tags, ...autoTags])];

    const { data, error } = await supa
      .from("bookmarks")
      .insert({
        user_id: user.id,
        message_id: messageId,
        chat_id: chatId,
        message_text: messageText,
        tags: finalTags,
        category: category || determineCategory(messageText),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, bookmark: data });

  } catch (error: any) {
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}

function categorizeBookmarks(bookmarks: any[]) {
  const categories = {
    'Survey Prep': [],
    'Regulations': [],
    'Policies': [],
    'Training': [],
    'Quality': [],
    'Other': []
  };

  bookmarks.forEach(bookmark => {
    const content = bookmark.message_text.toLowerCase();
    
    if (content.includes('survey') || content.includes('inspection')) {
      categories['Survey Prep'].push(bookmark);
    } else if (content.includes('cfr') || content.includes('f-tag') || content.includes('regulation')) {
      categories['Regulations'].push(bookmark);
    } else if (content.includes('policy') || content.includes('procedure')) {
      categories['Policies'].push(bookmark);
    } else if (content.includes('training') || content.includes('education')) {
      categories['Training'].push(bookmark);
    } else if (content.includes('quality') || content.includes('qapi')) {
      categories['Quality'].push(bookmark);
    } else {
      categories['Other'].push(bookmark);
    }
  });

  return categories;
}

function generateAutoTags(content: string): string[] {
  const tags = [];
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('survey')) tags.push('survey');
  if (lowerContent.includes('f-tag') || lowerContent.includes('ftag')) tags.push('f-tags');
  if (lowerContent.includes('cfr')) tags.push('regulations');
  if (lowerContent.includes('policy')) tags.push('policy');
  if (lowerContent.includes('training')) tags.push('training');
  if (lowerContent.includes('staff')) tags.push('staffing');
  if (lowerContent.includes('resident')) tags.push('resident-care');
  if (lowerContent.includes('infection')) tags.push('infection-control');
  if (lowerContent.includes('medication')) tags.push('medication');
  if (lowerContent.includes('documentation')) tags.push('documentation');
  
  return tags;
}

function determineCategory(content: string): string {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('survey') || lowerContent.includes('inspection')) return 'Survey Prep';
  if (lowerContent.includes('cfr') || lowerContent.includes('regulation')) return 'Regulations';
  if (lowerContent.includes('policy') || lowerContent.includes('procedure')) return 'Policies';
  if (lowerContent.includes('training') || lowerContent.includes('education')) return 'Training';
  if (lowerContent.includes('quality') || lowerContent.includes('qapi')) return 'Quality';
  
  return 'General';
}